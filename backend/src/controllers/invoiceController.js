const { pool } = require('../db');

// GET /api/invoices — paginated list with filters
async function list(req, res) {
  const { from, to, payment_type, source, page = 1, limit = 20 } = req.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const params     = [];
    let   idx        = 1;

    // Non-admin/viewer: restrict to their assigned location (from JWT)
    if (!['Admin', 'Viewer'].includes(req.user.roleName) && req.user.locationId) {
      conditions.push(`i.location_id = $${idx++}`);
      params.push(req.user.locationId);
    }

    if (from)         { conditions.push(`i.created_at >= $${idx++}`);   params.push(from); }
    if (to)           { conditions.push(`i.created_at <= $${idx++}`);   params.push(to); }
    if (payment_type) { conditions.push(`i.payment_type = $${idx++}`);  params.push(payment_type); }
    if (source)       { conditions.push(`i.source = $${idx++}`);        params.push(source); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM invoices i
      JOIN locations l ON i.location_id = l.id
      LEFT JOIN users u ON i.cashier_id = u.id
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT
          i.id, i.receipt_no, i.created_at,
          i.payment_type, i.payment_status,
          i.subtotal, i.discount, i.total_amount,
          i.source,
          u.full_name  AS cashier_name,
          l.name       AS location_name,
          (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) AS item_count
        ${baseQuery}
        ${where}
        ORDER BY i.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limitNum, offset]),

      pool.query(`SELECT COUNT(*) ${baseQuery} ${where}`, params),
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

// GET /api/invoices/:id — full invoice with items
async function getById(req, res) {
  try {
    const isAdmin = ['Admin', 'Viewer'].includes(req.user.roleName);
    const { rows: [invoice] } = await pool.query(`
      SELECT i.*, u.full_name AS cashier_name,
             l.name AS location_name, o.name AS organization
      FROM invoices i
      JOIN locations l     ON i.location_id     = l.id
      JOIN organizations o ON l.organization_id = o.id
      LEFT JOIN users u    ON i.cashier_id      = u.id
      WHERE i.id = $1
        AND ($2::boolean OR i.location_id = $3)
    `, [req.params.id, isAdmin, req.user.locationId]);

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

module.exports = { list, getById };
