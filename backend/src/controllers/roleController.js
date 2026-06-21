const { pool } = require('../db');

// GET /api/roles
async function list(req, res) {
  try {
    const { rows: roles } = await pool.query(
      'SELECT id, name, description, created_at FROM roles ORDER BY id'
    );
    const { rows: rp } = await pool.query(
      `SELECT rp.role_id, p.id, p.name, p.code
       FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id`
    );
    const result = roles.map(r => ({
      ...r,
      permissions: rp.filter(p => p.role_id === r.id).map(p => ({ id: p.id, name: p.name, code: p.code })),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/roles/permissions — list all permissions
async function listPermissions(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM permissions ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/roles
async function create(req, res) {
  const { name, description, permission_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [role] } = await client.query(
      'INSERT INTO roles (name, description) VALUES ($1,$2) RETURNING *',
      [name, description]
    );
    for (const pid of permission_ids) {
      await client.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [role.id, pid]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(role);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Role name already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// PUT /api/roles/:id
async function update(req, res) {
  const { id } = req.params;
  const { name, description, permission_ids } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [role] } = await client.query(
      `UPDATE roles SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name, description, id]
    );
    if (!role) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Role not found' }); }

    if (Array.isArray(permission_ids)) {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      for (const pid of permission_ids) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, pid]
        );
      }
    }
    await client.query('COMMIT');
    res.json(role);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// DELETE /api/roles/:id
async function remove(req, res) {
  const SYSTEM_ROLES = ['Admin', 'Viewer', 'Cashier'];
  try {
    const { rows: [role] } = await pool.query('SELECT name FROM roles WHERE id = $1', [req.params.id]);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (SYSTEM_ROLES.includes(role.name))
      return res.status(409).json({ error: 'Cannot delete a built-in system role' });

    const { rows: [used] } = await pool.query(
      'SELECT 1 FROM users WHERE role_id = $1 LIMIT 1', [req.params.id]
    );
    if (used) return res.status(409).json({ error: 'Cannot delete — users are assigned to this role' });

    await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, listPermissions, create, update, remove };
