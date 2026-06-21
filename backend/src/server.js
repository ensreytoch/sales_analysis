const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { pool }      = require('./db');
const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const roleRoutes        = require('./routes/roleRoutes');
const menuRoutes        = require('./routes/menuRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const posRoutes         = require('./routes/posRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const invoiceRoutes     = require('./routes/invoiceRoutes');
const productRoutes       = require('./routes/productRoutes');
const productConfigRoutes = require('./routes/productConfigRoutes');
const auth                = require('./middleware/authenticate');
const authorize           = require('./middleware/authorize');
const telegram            = require('./services/telegramService');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('✓ API is running.'));

app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/roles',        roleRoutes);
app.use('/api/menus',        menuRoutes);
app.use('/api/pos',          posRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/products',        productRoutes);
app.use('/api/product-configs', productConfigRoutes);
app.use('/api',              dashboardRoutes);

// Telegram test (Admin only)
app.post('/api/telegram/test', auth, authorize('users:read'), async (req, res) => {
  try {
    await telegram.sendTestMessage();
    res.json({ ok: true, message: 'Test message sent to Telegram' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock alert notifications (Admin/Viewer)
app.get('/api/notifications', auth, authorize('dashboard:read'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sa.id, sa.type, sa.qty_at_alert, sa.sent_at,
             pcfg.name AS product_name
      FROM stock_alerts sa
      JOIN products p        ON sa.product_id = p.id
      JOIN product_configs pcfg ON p.config_id = pcfg.id
      ORDER BY sa.sent_at DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Locations list for user assignment
app.get('/api/locations', auth, authorize('users:read'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.name, o.name AS organization
       FROM locations l JOIN organizations o ON l.organization_id = o.id
       ORDER BY o.name, l.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
pool.connect()
  .then(() => console.log('✓ Connected to PostgreSQL'))
  .catch(err => console.error('× DB connection error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Sundery Analytical Server running on http://localhost:${PORT}`);
});
