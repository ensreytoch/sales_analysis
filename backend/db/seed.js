const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CSV_PATH = path.join(__dirname, '../../dataset/cleaned_transactions.csv');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5434,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Admin',
  database: process.env.DB_NAME     || 'sundery_sales',
});

function parseCSV(content) {
  const lines   = content.split('\n');
  const headers = lines[0].trim().split(',').map(h => h.trim());
  return lines
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
      return row;
    })
    .filter(row => row.Order_Number);
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

async function seed() {
  console.log('📂 Reading CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows    = parseCSV(content);
  console.log(`   Loaded ${rows.length} rows`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Organizations
    const orgs = unique(rows.map(r => r.Organization));
    for (const name of orgs) {
      await client.query(
        'INSERT INTO organizations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]
      );
    }
    console.log(`✓ Organizations   : ${orgs.length}`);

    // 2. Regions
    const regions = unique(rows.map(r => r.Region_Area));
    for (const name of regions) {
      await client.query(
        'INSERT INTO regions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]
      );
    }
    console.log(`✓ Regions         : ${regions.length}`);

    // 3. Locations
    const locationKeys = unique(rows.map(r => `${r.Location}|||${r.Organization}`));
    for (const key of locationKeys) {
      const [loc, org] = key.split('|||');
      const { rows: [orgRow] } = await client.query(
        'SELECT id FROM organizations WHERE name = $1', [org]
      );
      if (!orgRow) continue;
      await client.query(
        'INSERT INTO locations (name, organization_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [loc, orgRow.id]
      );
    }
    console.log(`✓ Locations       : ${locationKeys.length}`);

    // 4. Routes
    const routeKeys = unique(rows.map(r => `${r.Route}|||${r.Location}|||${r.Region_Area}`));
    for (const key of routeKeys) {
      const [route, loc, region] = key.split('|||');
      const { rows: [locRow] } = await client.query('SELECT id FROM locations WHERE name = $1', [loc]);
      const { rows: [regRow] } = await client.query('SELECT id FROM regions  WHERE name = $1', [region]);
      if (!locRow || !regRow) continue;
      await client.query(
        'INSERT INTO routes (name, location_id, region_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [route, locRow.id, regRow.id]
      );
    }
    console.log(`✓ Routes          : ${routeKeys.length}`);

    // 5. Vending Machines
    const machineKeys = unique(rows.map(r => `${r.Vending_Machine_Name}|||${r.Device_Category}|||${r.Route}`));
    for (const key of machineKeys) {
      const [machine, devCat, route] = key.split('|||');
      const { rows: [routeRow] } = await client.query('SELECT id FROM routes WHERE name = $1', [route]);
      if (!routeRow) continue;
      await client.query(
        'INSERT INTO vending_machines (name, device_category, route_id) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [machine, devCat, routeRow.id]
      );
    }
    console.log(`✓ Vending machines: ${machineKeys.length}`);

    // 6. Product Categories
    const categories = unique(rows.map(r => r.Product_Category));
    for (const name of categories) {
      await client.query(
        'INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]
      );
    }
    console.log(`✓ Categories      : ${categories.length}`);

    // 7a. Product Configs (master catalog — unique by product name)
    const productKeys = unique(
      rows
        .filter(r => r.Product_Info && r.Product_Category)
        .map(r => `${r.Product_Info}|||${r.Product_Category}|||${r.Purchase_Price}`)
    );
    for (const key of productKeys) {
      const [name, category, price] = key.split('|||');
      const { rows: [catRow] } = await client.query(
        'SELECT id FROM product_categories WHERE name = $1', [category]
      );
      if (!catRow) continue;
      await client.query(
        'INSERT INTO product_configs (name, category_id, standard_price) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [name, catRow.id, parseFloat(price) || 0]
      );
    }
    console.log(`✓ Product configs : ${productKeys.length}`);

    // 7b. Products (inventory entries — one per config)
    const { rows: allConfigs } = await client.query('SELECT id FROM product_configs');
    for (const cfg of allConfigs) {
      await client.query(
        'INSERT INTO products (config_id) VALUES ($1) ON CONFLICT (config_id) DO NOTHING',
        [cfg.id]
      );
    }
    console.log(`✓ Products        : ${allConfigs.length}`);

    // 8. Invoices + Invoice Items (from CSV rows)
    // Pre-build lookup maps to avoid per-row DB roundtrips
    const machineMap   = {}; // machine name → { id, location_id }
    const productMap   = {}; // product name  → id

    const { rows: machines } = await client.query(`
      SELECT vm.id, vm.name, r.location_id
      FROM vending_machines vm
      JOIN routes r ON vm.route_id = r.id
    `);
    const { rows: products } = await client.query(`
      SELECT p.id, pcfg.name
      FROM products p
      JOIN product_configs pcfg ON p.config_id = pcfg.id
    `);

    machines.forEach(m => { machineMap[m.name] = { id: m.id, location_id: m.location_id }; });
    products.forEach(p => { productMap[p.name] = p.id; });

    // 8. Initial stock — seed each product with a starting qty
    // Uses a deterministic value based on product id to avoid randomness
    const { rows: allProducts } = await client.query('SELECT id FROM products');
    let stockCount = 0;
    for (const p of allProducts) {
      const initQty = 50 + (p.id % 10) * 15; // deterministic: 50–185
      await client.query(
        `UPDATE products SET stock_qty = $1 WHERE id = $2`,
        [initQty, p.id]
      );
      await client.query(`
        INSERT INTO stock_movements (product_id, type, quantity, notes)
        VALUES ($1, 'initial', $2, 'Opening stock from seed')
      `, [p.id, initQty]);
      stockCount++;
    }
    console.log(`✓ Initial stock   : ${stockCount} products`);

    let invoiceCount = 0;

    for (const row of rows) {
      const machine   = machineMap[row.Vending_Machine_Name];
      const productId = productMap[row.Product_Info];
      if (!machine || !productId || !row.Order_Number) continue;

      const orderAmount   = parseFloat(row.Order_Amount)    || 0;
      const discountAmount= parseFloat(row.Discount_Amount) || 0;
      const paymentAmount = parseFloat(row.Payment_Amount)  || orderAmount;

      // Create invoice (one per CSV order)
      const { rows: [invoice] } = await client.query(`
        INSERT INTO invoices (
          receipt_no, vending_machine_id, location_id,
          payment_type, payment_status,
          subtotal, discount, total_amount,
          source, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'historical',$9)
        ON CONFLICT (receipt_no) DO NOTHING
        RETURNING id
      `, [
        row.Order_Number,
        machine.id,
        machine.location_id,
        row.Payment_Type   || null,
        row.Payment_Status || 'completed',
        orderAmount,
        discountAmount,
        paymentAmount,
        row.Creation_Time  || null,
      ]);

      if (!invoice) continue; // already existed

      // Create single invoice item (CSV = 1 product per order)
      await client.query(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1,$2,1,$3,$3)
      `, [invoice.id, productId, orderAmount]);

      invoiceCount++;
    }

    await client.query('COMMIT');
    console.log(`✓ Invoices inserted: ${invoiceCount}`);
    console.log('✓ Seeding complete!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('× Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
