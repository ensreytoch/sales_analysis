const { pool } = require('../db');
const telegram  = require('./telegramService');

const threshold  = () => parseInt(process.env.TELEGRAM_LOW_STOCK_THRESHOLD || '10');
const dedupHours = () => parseInt(process.env.TELEGRAM_ALERT_DEDUP_HOURS   || '1');

const RETRY_DELAYS_MS = [2_000, 6_000, 18_000];

async function withRetry(fn) {
  let lastErr;
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (i < RETRY_DELAYS_MS.length - 1) {
        console.warn(`[StockAlert] retry ${i + 1} in ${RETRY_DELAYS_MS[i] / 1000}s — ${err.message}`);
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
    }
  }
  throw lastErr;
}

async function checkAndNotify(productId, newQty, productName) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  const type =
    newQty <= 0           ? 'out_of_stock' :
    newQty <= threshold() ? 'low_stock'    : null;

  if (!type) return;

  // Dedup: skip if same product+type alert was sent within dedupHours
  const { rows: [recent] } = await pool.query(`
    SELECT id FROM stock_alerts
    WHERE product_id = $1
      AND type       = $2
      AND sent_at    > NOW() - ($3 || ' hours')::INTERVAL
    LIMIT 1
  `, [productId, type, dedupHours()]);

  if (recent) return;

  // Insert dedup record first so concurrent calls don't double-send
  const { rows: [log] } = await pool.query(
    'INSERT INTO stock_alerts (product_id, type, qty_at_alert) VALUES ($1, $2, $3) RETURNING id',
    [productId, type, newQty]
  );

  try {
    await withRetry(() =>
      type === 'out_of_stock'
        ? telegram.sendOutOfStockAlert(productName)
        : telegram.sendLowStockAlert(productName, newQty, threshold())
    );
    console.log(`[StockAlert] ${type} sent for "${productName}" (qty: ${newQty})`);
  } catch (err) {
    // All retries exhausted — remove dedup so next stock event can try again
    await pool.query('DELETE FROM stock_alerts WHERE id = $1', [log.id]);
    console.error(`[StockAlert] all retries failed for "${productName}", dedup cleared:`, err.message);
  }
}

module.exports = { checkAndNotify };
