// // src/server.js
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const dashboardRoutes = require("./routes/dashboardRoutes");

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware Configuration
// app.use(cors({ origin: "http://localhost:5173" })); // Direct link access authorization for Vite React Client
// app.use(express.json());

// // Main Route Mounting
// app.use("/api", dashboardRoutes);

// // Fire up Server Engine Listener
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broken inside server middleware!');
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Sundery Analytical Server running securely on http://localhost:${PORT}`);
// });





// // src/server.js
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const dashboardRoutes = require("./routes/dashboardRoutes");

// const app = express();
// const PORT = process.env.PORT || 5000;

// // app.use(cors({ origin: "http://localhost:5173" })); 
// // Change this line inside backend/src/server.js:
// app.use(cors({ origin: "*" }));
// app.use(express.json());

// // Main Route Mounting
// app.use("/api", dashboardRoutes);

// app.listen(PORT, () => {
//   console.log(`🚀 Sundery Analytical Server running securely on http://localhost:${PORT}`);
// });

// backend/src/server.js

// Make sure your routes are prefixed with /api
// At the very bottom of backend/src/server.js





// // src/server.js
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();
// const { PrismaClient } = require("@prisma/client");

// const app = express();
// const prisma = new PrismaClient();
// const PORT = process.env.PORT || 5000;

// // =========================================================================
// // 1. OPEN CORS PIPELINE PIPING (Allows frontend localhost:5173 to sync data)
// // =========================================================================
// app.use(cors({ origin: "*" })); 
// app.use(express.json());

// // =========================================================================
// // 2. DASHBOARD DATA AGGREGATION ENDPOINT
// // =========================================================================
// app.get("/api/dashboard", async (req, res) => {
//   try {
//     console.log("📥 Incoming synchronization request from React Dashboard...");

//     // A. Core Card Metrics (Sales volumes and counter aggregates)
//     const salesAggregate = await prisma.order.aggregate({
//       _sum: { total_amount: true },
//       _count: { id: true }
//     });

//     // Total Cost computation (qty * cost_price per item)
//     const costResult = await prisma.$queryRaw`
//       SELECT SUM(qty * cost_price) as total_cost FROM order_items
//     `;
    
//     const totalSales = Number(salesAggregate._sum.total_amount) || 0;
//     const totalOrders = Number(salesAggregate._count.id) || 0;
//     const totalCost = Number(costResult[0]?.total_cost) || 0;
//     const totalProfit = totalSales - totalCost;

//     // B. Chart Trend 1: Sales By Hour Map Data
//     const salesByHour = await prisma.$queryRaw`
//       SELECT TO_CHAR(created_at, 'HH24') as hour, 
//              CAST(SUM(total_amount) AS FLOAT) as sales
//       FROM orders
//       GROUP BY hour
//       ORDER BY hour ASC
//     `;

//     // C. Chart Trend 2: Sales By Product Category Data
//     const salesByCategory = await prisma.$queryRaw`
//       SELECT p.category, CAST(SUM(oi.qty * oi.unit_price) AS FLOAT) as sales
//       FROM order_items oi
//       JOIN products p ON oi.product_id = p.id
//       GROUP BY p.category
//       ORDER BY sales DESC
//     `;

//     // D. Chart Trend 3: Sales By Region Area Data
//     const salesByRegion = await prisma.$queryRaw`
//       SELECT l.region, CAST(SUM(o.total_amount) AS FLOAT) as sales
//       FROM orders o
//       JOIN machines m ON o.machine_id = m.id
//       JOIN locations l ON m.location_id = l.id
//       GROUP BY l.region
//       ORDER BY sales DESC
//     `;

//     // E. Chart Trend 4: Payment Types Distribution 
//     const paymentAnalysis = await prisma.$queryRaw`
//       SELECT payment_type as type, CAST(SUM(total_amount) AS FLOAT) as sales
//       FROM orders
//       GROUP BY payment_type
//     `;

//     // Send data pack back over HTTP to React client app
//     res.json({
//       cards: { totalSales, totalOrders, totalCost, totalProfit },
//       charts: {
//         hourlyTrends: salesByHour,
//         categoryBreakdown: salesByCategory,
//         regionalPerformance: salesByRegion,
//         paymentDistribution: paymentAnalysis
//       }
//     });

//     console.log("📤 Metric arrays packed and dispatched successfully!");

//   } catch (error) {
//     console.error("❌ Database calculation aggregate error:", error);
//     res.status(500).json({ error: "Internal Server Processing Error" });
//   }
// });

// // =========================================================================
// // 3. START SERVER LISTENER ENGINE
// // =========================================================================
// app.listen(PORT, () => {
//   console.log(`🚀 Sundery Analytical Server running securely on http://localhost:${PORT}`);
// });







// backend/src/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

async function initializeDatabaseSystem() {
  const systemPool = new Pool({ 
    connectionString: "postgresql://postgres:Admin@localhost:5432/postgres" 
  });
  
  try {
    const dbCheck = await systemPool.query("SELECT 1 FROM pg_database WHERE datname = 'sundery_sales'");
    if (dbCheck.rows.length === 0) {
      await systemPool.query('CREATE DATABASE sundery_sales');
      console.log("🎯 Database 'sundery_sales' created successfully!");
    }
  } catch (err) {
    console.error("❌ System database management error:", err.message);
  } finally {
    await systemPool.end(); 
  }

  const pool = new Pool({ 
    connectionString: "postgresql://postgres:Admin@localhost:5432/sundery_sales" 
  });

  try {
    // 1. Create your clean transactions schema table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_time TIMESTAMP NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        cost_amount NUMERIC(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        region VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL
      );
    `);

    // 2. Clear old restricted rows to overwrite with full retail logs
    await pool.query('TRUNCATE TABLE transactions;');
    console.log("🧼 Transactions table cleared for fresh database population.");

    // 3. Seed 250 realistic retail rows distributed over multiple categories and hours
    console.log("🌱 Seeding full dashboard metrics dataset...");
    const bulkInsertQuery = `
      INSERT INTO transactions (transaction_time, total_amount, cost_amount, category, region, payment_method) 
      SELECT 
        NOW() - (val || ' hours')::INTERVAL AS transaction_time,
        CASE 
          WHEN val % 4 = 0 THEN 4.50
          WHEN val % 4 = 1 THEN 3.00
          WHEN val % 4 = 2 THEN 7.25
          ELSE 1.75
        END AS total_amount,
        CASE 
          WHEN val % 4 = 0 THEN 1.80
          WHEN val % 4 = 1 THEN 1.10
          WHEN val % 4 = 2 THEN 3.00
          ELSE 0.60
        END AS cost_amount,
        CASE 
          WHEN val % 4 = 0 THEN 'Beverage'
          WHEN val % 4 = 1 THEN 'Snacks'
          WHEN val % 4 = 2 THEN 'Coffee'
          ELSE 'Candy'
        END AS category,
        CASE 
          WHEN val % 3 = 0 THEN 'Phnom Penh'
          WHEN val % 3 = 1 THEN 'Siem Reap'
          ELSE 'Sihanoukville'
        END AS region,
        CASE 
          WHEN val % 2 = 0 THEN 'QR Code'
          ELSE 'Cash'
        END AS payment_method
      FROM generate_series(1, 250) AS val;
    `;
    
    await pool.query(bulkInsertQuery);
    console.log("🚀 250 transactional records successfully linked into sundery_sales database!");
    console.log('✅ Connected to PostgreSQL Database Successfully!');

  } catch (err) {
    console.error("❌ Database Schema initialization failed:", err.message);
  }

  // API Endpoint for Frontend Recharts
  app.get('/api/dashboard', async (req, res) => {
    try {
      const cardsResult = await pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS "totalSales",
          COUNT(id) AS "totalOrders",
          COALESCE(SUM(cost_amount), 0) AS "totalCost",
          (COALESCE(SUM(total_amount), 0) - COALESCE(SUM(cost_amount), 0)) AS "totalProfit"
        FROM transactions;
      `);

      const hourlyResult = await pool.query(`
        SELECT TO_CHAR(transaction_time, 'HH24:00') AS hour, COALESCE(SUM(total_amount), 0) AS sales
        FROM transactions GROUP BY hour ORDER BY hour;
      `);

      const categoryResult = await pool.query(`
        SELECT category, COALESCE(SUM(total_amount), 0) AS sales
        FROM transactions GROUP BY category ORDER BY sales DESC;
      `);

      const regionalResult = await pool.query(`
        SELECT region, COALESCE(SUM(total_amount), 0) AS sales
        FROM transactions GROUP BY region ORDER BY sales DESC;
      `);

      const paymentResult = await pool.query(`
        SELECT payment_method AS type, COALESCE(SUM(total_amount), 0) AS sales
        FROM transactions GROUP BY payment_method;
      `);

      res.json({
        cards: {
          totalSales: parseFloat(cardsResult.rows[0].totalSales),
          totalOrders: parseInt(cardsResult.rows[0].totalOrders),
          totalCost: parseFloat(cardsResult.rows[0].totalCost),
          totalProfit: parseFloat(cardsResult.rows[0].totalProfit)
        },
        charts: {
          hourlyTrends: hourlyResult.rows.map(r => ({ hour: r.hour, sales: parseFloat(r.sales) })),
          categoryBreakdown: categoryResult.rows.map(r => ({ category: r.category, sales: parseFloat(r.sales) })),
          regionalPerformance: regionalResult.rows.map(r => ({ region: r.region, sales: parseFloat(r.sales) })),
          paymentDistribution: paymentResult.rows.map(r => ({ type: r.type, sales: parseFloat(r.sales) }))
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Internal database query pipeline failure" });
    }
  });
}

initializeDatabaseSystem();

app.get('/', (req, res) => {
  res.send('🚀 Sundery Analytics API Server is running smoothly.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sundery Analytical Server running securely on http://localhost:${PORT}`);
});
