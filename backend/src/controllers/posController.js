const { pool }           = require('../db');
const { checkAndNotify } = require('../services/stockAlertService');

// GET /api/pos/location — cashier's assigned location
async function getLocation(req, res) {
  try {
    const { rows: [user] } = await pool.query(
      'SELECT location_id FROM users WHERE id = $1', [req.user.userId]
    );
    if (!user?.location_id)
      return res.status(400).json({ error: 'No location assigned to your account' });

    const { rows: [loc] } = await pool.query(`
      SELECT l.id, l.name, o.name AS organization
      FROM locations l
      JOIN organizations o ON l.organization_id = o.id
      WHERE l.id = $1
    `, [user.location_id]);

    res.json(loc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/pos/products
async function getProducts(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, pcfg.name, pcfg.image_url, cat.name AS category, p.stock_qty,
             COALESCE(p.purchase_price, pcfg.standard_price) AS price
      FROM products p
      JOIN product_configs pcfg ON p.config_id = pcfg.id
      JOIN product_categories cat ON pcfg.category_id = cat.id
      WHERE pcfg.is_active = TRUE
      ORDER BY cat.name, pcfg.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/pos/sell
async function sell(req, res) {
  const { items, payment_type, notes } = req.body;
  if (!items?.length)  return res.status(400).json({ error: 'Cart is empty' });
  if (!payment_type)   return res.status(400).json({ error: 'Payment type is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      'SELECT location_id FROM users WHERE id = $1', [req.user.userId]
    );
    if (!user?.location_id) throw new Error('No location assigned to your account');

    const subtotal   = items.reduce((sum, i) => sum + parseFloat(i.price) * parseInt(i.quantity), 0);
    const receiptNo  = `RCP-${Date.now().toString().slice(-8)}`;
    const stockCheck = []; // collect for post-commit alerts

    const { rows: [invoice] } = await client.query(`
      INSERT INTO invoices
        (receipt_no, cashier_id, location_id, payment_type, subtotal, total_amount, source, notes)
      VALUES ($1,$2,$3,$4,$5,$5,'pos',$6)
      RETURNING *
    `, [receiptNo, req.user.userId, user.location_id, payment_type, subtotal, notes || null]);

    for (const item of items) {
      const qty = parseInt(item.quantity);

      // Lock row and validate stock
      const { rows: [stock] } = await client.query(
        'SELECT p.stock_qty, pcfg.name FROM products p JOIN product_configs pcfg ON p.config_id = pcfg.id WHERE p.id = $1 FOR UPDATE',
        [item.product_id]
      );
      if (!stock) throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 404 });
      if (stock.stock_qty < qty)
        throw Object.assign(
          new Error(`"${stock.name}" only has ${stock.stock_qty} unit(s) in stock`),
          { status: 409 }
        );

      const itemSubtotal = parseFloat(item.price) * qty;
      await client.query(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1,$2,$3,$4,$5)
      `, [invoice.id, item.product_id, qty, item.price, itemSubtotal]);

      // Deduct stock
      const { rows: [updated] } = await client.query(
        'UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2 RETURNING stock_qty, config_id',
        [qty, item.product_id]
      );
      await client.query(`
        INSERT INTO stock_movements (product_id, type, quantity, reference_id, created_by)
        VALUES ($1, 'sale', $2, $3, $4)
      `, [item.product_id, -item.quantity, invoice.id, req.user.userId]);

      if (updated) stockCheck.push({ productId: item.product_id, qty: updated.stock_qty, configId: updated.config_id });
    }

    await client.query('COMMIT');

    // Fire Telegram alerts after commit (non-blocking)
    for (const { productId, qty, configId } of stockCheck) {
      pool.query('SELECT name FROM product_configs WHERE id = $1', [configId])
        .then(({ rows: [cfg] }) => checkAndNotify(productId, qty, cfg?.name || 'Unknown'))
        .catch(err => console.error('[StockAlert]', err.message));
    }
    res.status(201).json({
      invoiceId: invoice.id,
      receiptNo: invoice.receipt_no,
      total:     parseFloat(invoice.total_amount),
      createdAt: invoice.created_at,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// GET /api/pos/invoices — paginated invoice list
async function listInvoices(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const isAdmin = ['Admin', 'Viewer'].includes(req.user.roleName);
    const filter  = isAdmin ? '' : 'WHERE i.cashier_id = $3';
    const params  = isAdmin
      ? [parseInt(limit), offset]
      : [parseInt(limit), offset, req.user.userId];

    const { rows } = await pool.query(`
      SELECT i.id, i.receipt_no, i.payment_type, i.payment_status,
             i.subtotal, i.total_amount, i.source, i.created_at,
             u.full_name AS cashier_name, l.name AS location_name
      FROM invoices i
      JOIN locations l ON i.location_id = l.id
      LEFT JOIN users u ON i.cashier_id = u.id
      ${filter}
      ORDER BY i.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/pos/invoices/:id — invoice with items
async function getInvoice(req, res) {
  try {
    const { rows: [invoice] } = await pool.query(`
      SELECT i.*, u.full_name AS cashier_name,
             l.name AS location_name, o.name AS organization
      FROM invoices i
      JOIN locations l     ON i.location_id = l.id
      JOIN organizations o ON l.organization_id = o.id
      LEFT JOIN users u    ON i.cashier_id = u.id
      WHERE i.id = $1
    `, [req.params.id]);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { rows: items } = await pool.query(`
      SELECT ii.quantity, ii.unit_price, ii.subtotal, pcfg.name AS product_name
      FROM invoice_items ii
      JOIN products p     ON ii.product_id = p.id
      JOIN product_configs pcfg ON p.config_id = pcfg.id
      WHERE ii.invoice_id = $1
    `, [req.params.id]);

    res.json({ ...invoice, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getLocation, getProducts, sell, listInvoices, getInvoice };
