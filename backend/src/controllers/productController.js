const { pool }           = require('../db');
const { checkAndNotify } = require('../services/stockAlertService');

// GET /api/products?page=1&limit=20&search=&category_id=&location_id=
async function list(req, res) {
  const { search, category_id, location_id, page = 1, limit = 20 } = req.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const offset   = (pageNum - 1) * limitNum;
  const isAdmin  = ['Admin', 'Viewer'].includes(req.user.roleName);

  const conditions = [];
  const params     = [];
  let   idx        = 1;

  if (search)      { conditions.push(`pcfg.name ILIKE $${idx++}`);    params.push(`%${search}%`); }
  if (category_id) { conditions.push(`pcfg.category_id = $${idx++}`); params.push(parseInt(category_id)); }

  // Admins can filter by location via query param; cashiers are always scoped to their location
  if (isAdmin && location_id) {
    conditions.push(`p.location_id = $${idx++}`);
    params.push(parseInt(location_id));
  } else if (!isAdmin && req.user.locationId) {
    conditions.push(`p.location_id = $${idx++}`);
    params.push(req.user.locationId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Stock summary scoped the same way
  const stockWhere = (!isAdmin && req.user.locationId)
    ? `WHERE location_id = ${req.user.locationId}`
    : '';

  try {
    const [dataRes, countRes, stockRes] = await Promise.all([
      pool.query(`
        SELECT p.id, p.config_id, p.stock_qty, p.location_id,
               pcfg.name, pcfg.image_url, pcfg.standard_price, pcfg.description,
               COALESCE(p.purchase_price, pcfg.standard_price) AS purchase_price,
               p.purchase_price IS NOT NULL AS price_overridden,
               cat.id AS category_id, cat.name AS category,
               l.name AS location_name
        FROM products p
        JOIN product_configs pcfg ON p.config_id = pcfg.id
        JOIN product_categories cat ON pcfg.category_id = cat.id
        LEFT JOIN locations l ON p.location_id = l.id
        ${where}
        ORDER BY cat.name, pcfg.name
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limitNum, offset]),

      pool.query(`
        SELECT COUNT(*) FROM products p
        JOIN product_configs pcfg ON p.config_id = pcfg.id
        ${where}
      `, params),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE stock_qty <= 0) AS out_of_stock,
          COUNT(*) FILTER (WHERE stock_qty > 0 AND stock_qty < 10) AS low_stock
        FROM products
        ${stockWhere}
      `),
    ]);

    res.json({
      data:       dataRes.rows,
      total:      parseInt(countRes.rows[0].count),
      page:       pageNum,
      limit:      limitNum,
      outOfStock: parseInt(stockRes.rows[0].out_of_stock),
      lowStock:   parseInt(stockRes.rows[0].low_stock),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/products/categories
async function listCategories(req, res) {
  try {
    const { rows } = await pool.query('SELECT id, name FROM product_categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/products
async function create(req, res) {
  const { config_id, purchase_price, initial_stock = 0 } = req.body;
  if (!config_id) return res.status(400).json({ error: 'config_id is required' });

  const isAdmin    = ['Admin', 'Viewer'].includes(req.user.roleName);
  const locationId = isAdmin ? (req.body.location_id || null) : req.user.locationId;
  if (!locationId) return res.status(400).json({ error: 'location_id is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [product] } = await client.query(`
      INSERT INTO products (config_id, location_id, purchase_price, stock_qty)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [config_id, locationId, purchase_price || null, parseInt(initial_stock)]);

    if (parseInt(initial_stock) > 0) {
      await client.query(`
        INSERT INTO stock_movements (product_id, type, quantity, notes, created_by)
        VALUES ($1, 'initial', $2, 'Initial stock on product creation', $3)
      `, [product.id, parseInt(initial_stock), req.user.userId]);
    }

    await client.query('COMMIT');

    pool.query('SELECT name FROM product_configs WHERE id = $1', [config_id])
      .then(({ rows: [cfg] }) => checkAndNotify(product.id, parseInt(initial_stock), cfg?.name || 'Unknown'))
      .catch(err => console.error('[StockAlert]', err.message));

    res.status(201).json(product);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.constraint === 'products_config_location_unique')
      return res.status(409).json({ error: 'This product is already in inventory for this location' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// PUT /api/products/:id
async function update(req, res) {
  const { purchase_price } = req.body;
  const isAdmin = ['Admin', 'Viewer'].includes(req.user.roleName);
  try {
    const locationClause = (!isAdmin && req.user.locationId)
      ? `AND location_id = ${req.user.locationId}` : '';

    const { rows: [product] } = await pool.query(`
      UPDATE products SET purchase_price = $1
      WHERE id = $2 ${locationClause}
      RETURNING *
    `, [purchase_price ?? null, req.params.id]);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/products/:id
async function remove(req, res) {
  try {
    const { rows: [used] } = await pool.query(
      'SELECT 1 FROM invoice_items WHERE product_id = $1 LIMIT 1', [req.params.id]
    );
    if (used) return res.status(409).json({ error: 'Cannot delete — product has sales history' });

    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/products/:id/restock
async function restock(req, res) {
  const { quantity, notes } = req.body;
  const qty = parseInt(quantity);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' });

  const isAdmin = ['Admin', 'Viewer'].includes(req.user.roleName);
  const client  = await pool.connect();
  try {
    await client.query('BEGIN');

    const locationClause = (!isAdmin && req.user.locationId)
      ? `AND location_id = ${req.user.locationId}` : '';

    const { rows: [product] } = await client.query(
      `UPDATE products SET stock_qty = stock_qty + $1 WHERE id = $2 ${locationClause} RETURNING id, stock_qty`,
      [qty, req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await client.query(`
      INSERT INTO stock_movements (product_id, type, quantity, notes, created_by)
      VALUES ($1, 'restock', $2, $3, $4)
    `, [product.id, qty, notes || null, req.user.userId]);

    await client.query('COMMIT');

    pool.query(
      'SELECT p.stock_qty, pcfg.name FROM products p JOIN product_configs pcfg ON p.config_id = pcfg.id WHERE p.id = $1',
      [product.id]
    )
      .then(({ rows: [p] }) => { if (p) checkAndNotify(product.id, p.stock_qty, p.name); })
      .catch(err => console.error('[StockAlert]', err.message));

    res.json(product);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// GET /api/products/:id/movements
async function movements(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT sm.id, sm.type, sm.quantity, sm.notes, sm.created_at,
             u.full_name AS created_by_name
      FROM stock_movements sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      LIMIT 50
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, listCategories, create, update, remove, restock, movements };
