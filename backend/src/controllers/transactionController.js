const { pool } = require('../db');

async function list(req, res) {
  const { from, to, payment_type, page = 1, limit = 20 } = req.query;
  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const params     = [];
    let   idx        = 1;

    // Non-admin: restrict to their assigned location (from JWT)
    if (!['Admin', 'Viewer'].includes(req.user.roleName) && req.user.locationId) {
      conditions.push(`i.location_id = $${idx++}`);
      params.push(req.user.locationId);
    }

    if (from)         { conditions.push(`i.created_at >= $${idx++}`);    params.push(from); }
    if (to)           { conditions.push(`i.created_at <= $${idx++}`);    params.push(to); }
    if (payment_type) { conditions.push(`i.payment_type = $${idx++}`);   params.push(payment_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseJoin = `
      FROM invoices i
      JOIN invoice_items ii          ON ii.invoice_id         = i.id
      JOIN products pr               ON ii.product_id         = pr.id
      JOIN product_configs pcfg      ON pr.config_id          = pcfg.id
      JOIN product_categories pc     ON pcfg.category_id      = pc.id
      JOIN locations l               ON i.location_id         = l.id
      LEFT JOIN users u           ON i.cashier_id            = u.id
      LEFT JOIN vending_machines vm ON i.vending_machine_id  = vm.id
      LEFT JOIN routes rt         ON vm.route_id             = rt.id
      LEFT JOIN regions r         ON rt.region_id            = r.id
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT
          i.id,
          i.receipt_no      AS order_number,
          i.created_at      AS creation_time,
          ii.subtotal       AS order_amount,
          pcfg.name         AS product_name,
          pc.name           AS category,
          vm.name           AS machine_name,
          l.name            AS location_name,
          r.name            AS region_name,
          i.payment_type,
          i.payment_status,
          i.source,
          u.full_name       AS cashier_name,
          ii.quantity,
          ii.unit_price
        ${baseJoin}
        ${where}
        ORDER BY i.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limitNum, offset]),

      pool.query(`SELECT COUNT(*) ${baseJoin} ${where}`, params),
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

module.exports = { list };
