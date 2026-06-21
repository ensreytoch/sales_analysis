const https = require('https');

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body   = JSON.stringify(data);
    const parsed = new URL(url);
    const opts   = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendMessage(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const result = await httpPost(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'HTML' }
    );
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
  } catch (err) {
    console.error('[Telegram]', err.message);
    throw err;
  }
}

function ts() {
  return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

async function sendLowStockAlert(productName, qty, threshold) {
  const lines = [
    `<b>Low Stock Alert</b>`,
    ``,
    `${escapeHtml(productName)} is running low.`,
    `Remaining: <b>${qty} units</b> (threshold: ${threshold} units)`,
    ``,
    `${ts()} — Sundery BI`,
  ];
  await sendMessage(lines.join('\n'));
}

async function sendOutOfStockAlert(productName) {
  const lines = [
    `<b>Out of Stock</b>`,
    ``,
    `${escapeHtml(productName)} has run out.`,
    `Please arrange a restock as soon as possible.`,
    ``,
    `${ts()} — Sundery BI`,
  ];
  await sendMessage(lines.join('\n'));
}

async function sendTestMessage() {
  const lines = [
    `<b>Connection test passed.</b>`,
    ``,
    `Sundery BI stock alerts are now active.`,
    `${ts()}`,
  ];
  await sendMessage(lines.join('\n'));
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { sendMessage, sendLowStockAlert, sendOutOfStockAlert, sendTestMessage };
