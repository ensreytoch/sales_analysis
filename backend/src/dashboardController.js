// src/controllers/dashboardController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getDashboardData = async (req, res) => {
  try {
    // ==========================================
    // 1. CORE KPI CARD CALCULATIONS
    // ==========================================
    const salesAggregate = await prisma.order.aggregate({
      _sum: { total_amount: true },
      _count: { id: true }
    });

    // Explicitly compute Total Cost (qty * cost_price per item) using queryRaw
    const costResult = await prisma.$queryRaw`
      SELECT SUM(qty * cost_price) as total_cost FROM order_items
    `;
    
    const totalSales = Number(salesAggregate._sum.total_amount) || 0;
    const totalOrders = Number(salesAggregate._count.id) || 0;
    const totalCost = Number(costResult[0]?.total_cost) || 0;
    const totalProfit = totalSales - totalCost;

    // ==========================================
    // 2. TIMELINE ANALYSIS CHART (Sales by Hour)
    // ==========================================
    const salesByHour = await prisma.$queryRaw`
      SELECT TO_CHAR(created_at, 'HH24') as hour, 
             CAST(SUM(total_amount) AS FLOAT) as sales
      FROM orders
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // ==========================================
    // 3. CATEGORICAL, REGIONAL & PAYMENT AGGREGATIONS
    // ==========================================
    const salesByCategory = await prisma.$queryRaw`
      SELECT p.category, CAST(SUM(oi.qty * oi.unit_price) AS FLOAT) as sales
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.category
      ORDER BY sales DESC
    `;

    const salesByRegion = await prisma.$queryRaw`
      SELECT l.region, CAST(SUM(o.total_amount) AS FLOAT) as sales
      FROM orders o
      JOIN machines m ON o.machine_id = m.id
      JOIN locations l ON m.location_id = l.id
      GROUP BY l.region
      ORDER BY sales DESC
    `;

    const paymentAnalysis = await prisma.$queryRaw`
      SELECT payment_type as type, CAST(SUM(total_amount) AS FLOAT) as sales
      FROM orders
      GROUP BY payment_type
    `;

    // Package calculations neatly into JSON for the React Frontend
    res.json({
      cards: {
        totalSales,
        totalOrders,
        totalCost,
        totalProfit,
      },
      charts: {
        hourlyTrends: salesByHour,
        categoryBreakdown: salesByCategory,
        regionalPerformance: salesByRegion,
        paymentDistribution: paymentAnalysis
      }
    });

  } catch (error) {
    console.error("Dashboard Aggregation Processing Error:", error);
    res.status(500).json({ error: "Internal Server Processing Error" });
  }
};