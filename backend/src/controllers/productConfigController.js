const { pool } = require('../db');

// GET /api/product-configs?page=1&limit=20&search=&category_id=
async function list(req, res) {
  const { search, category_id, page = 1, limit = 20 } = req.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const offset   = (pageNum - 1) * limitNum;

  const conditions = [];
  const params     = [];
  let   idx        = 1;

  if (search)      { conditions.push(`pc.name ILIKE $${idx++}`);        params.push(`%${search}%`); }
  if (category_id) { conditions.push(`pc.category_id = $${idx++}`);     params.push(parseInt(category_id)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT pc.id, pc.name, pc.standard_price, pc.image_url, pc.description, pc.is_active, pc.created_at,
               cat.id AS category_id, cat.name AS category,
               (SELECT COUNT(*) FROM products p WHERE p.config_id = pc.id) AS product_count
        FROM product_configs pc
        JOIN product_categories cat ON pc.category_id = cat.id
        ${where}
        ORDER BY cat.name, pc.name
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limitNum, offset]),

      pool.query(`
        SELECT COUNT(*) FROM product_configs pc ${where}
      `, params),
    ]);

    res.json({
      data:  dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/product-configs/all — flat list for dropdowns
async function listAll(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT pc.id, pc.name, pc.standard_price, pc.image_url, pc.description, pc.is_active,
             cat.id AS category_id, cat.name AS category
      FROM product_configs pc
      JOIN product_categories cat ON pc.category_id = cat.id
      WHERE pc.is_active = TRUE
      ORDER BY cat.name, pc.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/product-configs/categories
async function listCategories(req, res) {
  try {
    const { rows } = await pool.query('SELECT id, name FROM product_categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/product-configs
async function create(req, res) {
  const { name, category_id, standard_price, image_url, description } = req.body;
  if (!name || !category_id || standard_price == null)
    return res.status(400).json({ error: 'name, category_id, and standard_price are required' });

  try {
    const { rows: [config] } = await pool.query(`
      INSERT INTO product_configs (name, category_id, standard_price, image_url, description)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [name.trim(), category_id, standard_price, image_url || null, description || null]);

    res.status(201).json(config);
  } catch (err) {
    if (err.constraint === 'product_configs_name_key')
      return res.status(409).json({ error: 'A product with this name already exists in the catalog' });
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/product-configs/:id
async function update(req, res) {
  const { name, category_id, standard_price, image_url, description, is_active } = req.body;
  try {
    const { rows: [config] } = await pool.query(`
      UPDATE product_configs
      SET name = $1, category_id = $2, standard_price = $3,
          image_url = $4, description = $5, is_active = $6
      WHERE id = $7
      RETURNING *
    `, [name?.trim(), category_id, standard_price, image_url || null, description || null,
        is_active !== undefined ? is_active : true, req.params.id]);

    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (err) {
    if (err.constraint === 'product_configs_name_key')
      return res.status(409).json({ error: 'A product with this name already exists in the catalog' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/product-configs/:id
async function remove(req, res) {
  try {
    const { rows: [linked] } = await pool.query(
      'SELECT 1 FROM products WHERE config_id = $1 LIMIT 1', [req.params.id]
    );
    if (linked)
      return res.status(409).json({ error: 'Cannot delete — a product in inventory uses this config' });

    const { rowCount } = await pool.query('DELETE FROM product_configs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Config not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, listAll, listCategories, create, update, remove };
