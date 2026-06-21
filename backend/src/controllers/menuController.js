const { pool } = require('../db');

function buildTree(items, parentId = null) {
  return items
    .filter(i => i.parent_id === parentId)
    .map(i => ({ ...i, children: buildTree(items, i.id) }));
}

// GET /api/menus — filtered by caller's permissions
async function getMenuTree(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.parent_id, m.label, m.path, m.icon, m.sort_order
       FROM menus m
       LEFT JOIN permissions p ON m.permission_id = p.id
       WHERE m.is_active = true
         AND (m.permission_id IS NULL OR p.code = ANY($1::text[]))
       ORDER BY m.sort_order`,
      [req.user.permissions]
    );
    res.json(buildTree(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/menus/all — admin: full tree without permission filter
async function getAllMenus(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, p.code AS permission_code
       FROM menus m
       LEFT JOIN permissions p ON m.permission_id = p.id
       ORDER BY m.sort_order`
    );
    res.json(buildTree(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMenuTree, getAllMenus };
