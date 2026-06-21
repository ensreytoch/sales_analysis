-- ============================================================
-- V3: Product stock tracking
-- ============================================================

-- Add stock column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty INT NOT NULL DEFAULT 0;

-- Stock movements audit log
-- quantity is signed: positive = stock in, negative = stock out
CREATE TABLE IF NOT EXISTS stock_movements (
    id          SERIAL      PRIMARY KEY,
    product_id  INT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('initial', 'restock', 'sale', 'adjustment')),
    quantity    INT         NOT NULL,
    reference_id INT,                                          -- invoice_id for sales
    notes       TEXT,
    created_by  INT         REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- ── Permissions ──────────────────────────────────────────────
INSERT INTO permissions (name, code) VALUES
    ('View Products',   'products:read'),
    ('Manage Products', 'products:write')
ON CONFLICT (code) DO NOTHING;

-- Admin → both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.code IN ('products:read', 'products:write')
ON CONFLICT DO NOTHING;

-- Viewer → read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Viewer' AND p.code = 'products:read'
ON CONFLICT DO NOTHING;

-- Cashier → read only (see stock before selling)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Cashier' AND p.code = 'products:read'
ON CONFLICT DO NOTHING;

-- ── Menu ─────────────────────────────────────────────────────
-- Shift Transactions (3→4), Invoices (4→5), Settings (5→6)
UPDATE menus SET sort_order = sort_order + 1
WHERE parent_id IS NULL AND sort_order >= 3;

-- Insert Products at sort 3
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
    (NULL, 'Products', '/products', 'Package', 3,
        (SELECT id FROM permissions WHERE code = 'products:read'))
ON CONFLICT DO NOTHING;
