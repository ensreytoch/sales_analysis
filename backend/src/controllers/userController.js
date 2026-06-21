const bcrypt = require('bcryptjs');
const { pool } = require('../db');

// GET /api/users
async function list(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.is_active, u.created_at,
              u.role_id, r.name AS role_name,
              u.location_id, l.name AS location_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN locations l ON u.location_id = l.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users
async function create(req, res) {
  const { email, password, full_name, role_id, location_id } = req.body;
  if (!email || !password || !role_id) {
    return res.status(400).json({ error: 'email, password, role_id are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, location_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, is_active, created_at`,
      [email, hash, full_name, role_id, location_id || null]
    );
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/users/:id
async function update(req, res) {
  const { id } = req.params;
  const { full_name, role_id, is_active, password, location_id } = req.body;
  try {
    let hash;
    if (password) hash = await bcrypt.hash(password, 10);

    const { rows: [user] } = await pool.query(
      `UPDATE users SET
         full_name     = COALESCE($1, full_name),
         role_id       = COALESCE($2, role_id),
         is_active     = COALESCE($3, is_active),
         password_hash = COALESCE($4, password_hash),
         location_id   = $5,
         updated_at    = NOW()
       WHERE id = $6
       RETURNING id, email, full_name, is_active, role_id, location_id`,
      [full_name, role_id, is_active, hash || null, location_id ?? null, id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/users/:id
async function remove(req, res) {
  const { id } = req.params;
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, create, update, remove };
