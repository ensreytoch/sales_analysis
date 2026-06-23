const router       = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { pool }     = require('../db');

router.get('/dashboard', authenticate, authorize('dashboard:read'), async (req, res) => {
  try {
    const isAdmin    = ['Admin', 'Viewer'].includes(req.user.roleName);
    const locationId = isAdmin ? null : req.user.locationId;

    // Build reusable WHERE clause fragment and params for location scoping
    const locWhere  = locationId ? 'WHERE location_id = $1'       : '';
    const locAnd    = locationId ? 'AND i.location_id = $1'       : '';
    const locParams = locationId ? [locationId]                    : [];

    const [cardsResult, hourlyResult, categoryResult, regionalResult, paymentResult] =
      await Promise.all([

        // KPI cards
        pool.query(`
          SELECT
            (SELECT COALESCE(SUM(total_amount), 0) FROM invoices ${locWhere})  AS "totalSales",
            (SELECT COUNT(*)                        FROM invoices ${locWhere})  AS "totalOrders",
            COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, pcfg.standard_price)), 0) AS "totalCost"
          FROM invoice_items ii
          JOIN invoices i                ON ii.invoice_id  = i.id
          JOIN products p                ON ii.product_id  = p.id
          LEFT JOIN product_configs pcfg ON p.config_id    = pcfg.id
          ${locationId ? 'WHERE i.location_id = $1' : ''}
        `, locParams),

        // Sales by hour
        pool.query(`
          SELECT TO_CHAR(created_at, 'HH24:00') AS hour,
                 COALESCE(SUM(total_amount), 0) AS sales
          FROM invoices
          ${locWhere}
          GROUP BY hour
          ORDER BY hour
        `, locParams),

        // Sales by product category
        pool.query(`
          SELECT COALESCE(cat.name, 'Uncategorized') AS category,
                 COALESCE(SUM(ii.subtotal), 0)       AS sales
          FROM invoice_items ii
          JOIN invoices i                  ON ii.invoice_id    = i.id
          JOIN products p                  ON ii.product_id    = p.id
          LEFT JOIN product_configs pcfg   ON p.config_id      = pcfg.id
          LEFT JOIN product_categories cat ON pcfg.category_id = cat.id
          ${locationId ? 'WHERE i.location_id = $1' : ''}
          GROUP BY cat.name
          ORDER BY sales DESC
        `, locParams),

        // Sales by region
        pool.query(`
          SELECT r.name                           AS region,
                 COALESCE(SUM(i.total_amount), 0) AS sales
          FROM invoices i
          JOIN vending_machines vm ON i.vending_machine_id = vm.id
          JOIN routes rt           ON vm.route_id           = rt.id
          JOIN regions r           ON rt.region_id          = r.id
          ${locationId ? 'WHERE i.location_id = $1' : ''}
          GROUP BY r.name
          ORDER BY sales DESC
        `, locParams),

        // Sales by payment type
        pool.query(`
          SELECT payment_type                    AS type,
                 COALESCE(SUM(total_amount), 0) AS sales
          FROM invoices i
          WHERE payment_type IS NOT NULL
          ${locAnd}
          GROUP BY payment_type
        `, locParams),
      ]);

    res.json({
      cards: {
        totalSales:  parseFloat(cardsResult.rows[0].totalSales),
        totalOrders: parseInt(cardsResult.rows[0].totalOrders),
        totalCost:   parseFloat(cardsResult.rows[0].totalCost),
        totalProfit: parseFloat(cardsResult.rows[0].totalSales) - parseFloat(cardsResult.rows[0].totalCost),
      },
      charts: {
        hourlyTrends:        hourlyResult.rows.map(r => ({ hour: r.hour, sales: parseFloat(r.sales) })),
        categoryBreakdown:   categoryResult.rows.map(r => ({ category: r.category, sales: parseFloat(r.sales) })),
        regionalPerformance: regionalResult.rows.map(r => ({ region: r.region, sales: parseFloat(r.sales) })),
        paymentDistribution: paymentResult.rows.map(r => ({ type: r.type, sales: parseFloat(r.sales) })),
      },
    });
  } catch (error) {
    console.error('Dashboard query error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
