const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { pool } = require('../db');

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows: [user] } = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active,
              r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Load permissions
    const { rows: perms } = await pool.query(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );
    const permissions = perms.map(p => p.code);

    const payload = {
      userId: user.id,
      email:  user.email,
      fullName: user.full_name,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions,
    };

    const accessToken   = signAccess(payload);
    const refreshToken  = crypto.randomBytes(40).toString('hex');
    const refreshHash   = hashToken(refreshToken);
    const expiresAt     = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, refreshHash, expiresAt]
    );

    res.json({ accessToken, refreshToken, user: payload });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/refresh
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const hash = hashToken(refreshToken);
    const { rows: [stored] } = await pool.query(
      `SELECT rt.*, u.id AS uid, u.email, u.full_name, u.is_active,
              r.id AS role_id, r.name AS role_name
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       JOIN roles r ON u.role_id  = r.id
       WHERE rt.token_hash = $1`,
      [hash]
    );

    if (!stored || new Date(stored.expires_at) < new Date() || !stored.is_active) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { rows: perms } = await pool.query(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [stored.role_id]
    );

    const payload = {
      userId: stored.uid,
      email:  stored.email,
      fullName: stored.full_name,
      roleId: stored.role_id,
      roleName: stored.role_name,
      permissions: perms.map(p => p.code),
    };

    const accessToken = signAccess(payload);
    res.json({ accessToken, user: payload });
  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
  }
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const { rows: menuRows } = await pool.query(
      `SELECT m.id, m.parent_id, m.label, m.path, m.icon, m.sort_order
       FROM menus m
       LEFT JOIN permissions p ON m.permission_id = p.id
       WHERE m.is_active = true
         AND (m.permission_id IS NULL OR p.code = ANY($1::text[]))
       ORDER BY m.sort_order`,
      [req.user.permissions]
    );

    const buildTree = (items, parentId = null) =>
      items
        .filter(i => i.parent_id === parentId)
        .map(i => ({ ...i, children: buildTree(items, i.id) }));

    res.json({ user: req.user, menu: buildTree(menuRows) });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { login, refresh, logout, me };
