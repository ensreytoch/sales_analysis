const router       = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const { pool }     = require('../db');

router.get('/dashboard', authenticate, authorize('dashboard:read'), async (req, res) => {
  try {
    const [cardsResult, hourlyResult, categoryResult, regionalResult, paymentResult] =
      await Promise.all([

        // KPI cards — revenue/orders direct from invoices, cost via LEFT JOIN to handle legacy rows
        pool.query(`
          SELECT
            (SELECT COALESCE(SUM(total_amount), 0) FROM invoices)  AS "totalSales",
            (SELECT COUNT(*)                        FROM invoices)  AS "totalOrders",
            COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, pcfg.standard_price)), 0) AS "totalCost"
          FROM invoice_items ii
          JOIN products p              ON ii.product_id  = p.id
          LEFT JOIN product_configs pcfg ON p.config_id = pcfg.id
        `),

        // Sales by hour
        pool.query(`
          SELECT TO_CHAR(created_at, 'HH24:00') AS hour,
                 COALESCE(SUM(total_amount), 0) AS sales
          FROM invoices
          GROUP BY hour
          ORDER BY hour
        `),

        // Sales by product category
        pool.query(`
          SELECT COALESCE(cat.name, 'Uncategorized') AS category,
                 COALESCE(SUM(ii.subtotal), 0)       AS sales
          FROM invoice_items ii
          JOIN products p                ON ii.product_id    = p.id
          LEFT JOIN product_configs pcfg ON p.config_id      = pcfg.id
          LEFT JOIN product_categories cat ON pcfg.category_id = cat.id
          GROUP BY cat.name
          ORDER BY sales DESC
        `),

        // Sales by region (historical data has vending_machine_id → route → region)
        pool.query(`
          SELECT r.name                           AS region,
                 COALESCE(SUM(i.total_amount), 0) AS sales
          FROM invoices i
          JOIN vending_machines vm ON i.vending_machine_id = vm.id
          JOIN routes rt           ON vm.route_id           = rt.id
          JOIN regions r           ON rt.region_id          = r.id
          GROUP BY r.name
          ORDER BY sales DESC
        `),

        // Sales by payment type
        pool.query(`
          SELECT payment_type                      AS type,
                 COALESCE(SUM(total_amount), 0)   AS sales
          FROM invoices
          WHERE payment_type IS NOT NULL
          GROUP BY payment_type
        `),
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
