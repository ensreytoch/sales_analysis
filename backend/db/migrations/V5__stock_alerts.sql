-- ============================================================
-- V5: Stock alerts log (dedup for Telegram notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_alerts (
    id           SERIAL      PRIMARY KEY,
    product_id   INT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type         VARCHAR(20) NOT NULL CHECK (type IN ('low_stock', 'out_of_stock')),
    qty_at_alert INT         NOT NULL,
    sent_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_lookup
    ON stock_alerts (product_id, type, sent_at DESC);
