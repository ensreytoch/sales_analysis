-- ============================================================
-- V4: Product configs (master catalog) + menu restructure
-- ============================================================

-- ── Product Configs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_configs (
    id             SERIAL        PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL UNIQUE,
    category_id    INT           NOT NULL REFERENCES product_categories(id),
    standard_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    image_url      TEXT,
    description    TEXT,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_configs_category ON product_configs(category_id);
CREATE INDEX IF NOT EXISTS idx_product_configs_active   ON product_configs(is_active);

-- ── Restructure products: link to config ─────────────────────
-- Drop old columns now derived from product_configs
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;
ALTER TABLE products DROP COLUMN IF EXISTS name;
ALTER TABLE products DROP COLUMN IF EXISTS category_id;
ALTER TABLE products DROP COLUMN IF EXISTS image_url;

-- purchase_price becomes optional override (NULL = use config standard_price)
ALTER TABLE products ALTER COLUMN purchase_price DROP NOT NULL;
ALTER TABLE products ALTER COLUMN purchase_price SET DEFAULT NULL;

-- Link to config (one product per config for now)
ALTER TABLE products ADD COLUMN IF NOT EXISTS config_id INT REFERENCES product_configs(id);
ALTER TABLE products ADD CONSTRAINT products_config_id_unique UNIQUE (config_id);

-- ── Permissions ──────────────────────────────────────────────
INSERT INTO permissions (name, code) VALUES
    ('View Product Catalog',   'product-configs:read'),
    ('Manage Product Catalog', 'product-configs:write')
ON CONFLICT (code) DO NOTHING;

-- Admin → both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.code IN ('product-configs:read', 'product-configs:write')
ON CONFLICT DO NOTHING;

-- Viewer → read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Viewer' AND p.code = 'product-configs:read'
ON CONFLICT DO NOTHING;

-- Cashier → read (see catalog when creating products)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Cashier' AND p.code = 'product-configs:read'
ON CONFLICT DO NOTHING;

-- ── Menu restructure ─────────────────────────────────────────
DELETE FROM menus;

-- Dashboard (standalone root)
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
(NULL, 'Dashboard', '/dashboard', 'LayoutDashboard', 1,
    (SELECT id FROM permissions WHERE code = 'dashboard:read'));

-- Sales group (visible to all authenticated users)
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
(NULL, 'Sales', NULL, 'TrendingUp', 2,
    (SELECT id FROM permissions WHERE code = 'dashboard:read'));

INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
((SELECT id FROM menus WHERE label = 'Sales' AND parent_id IS NULL),
    'Point of Sale', '/pos', 'ShoppingCart', 1,
    (SELECT id FROM permissions WHERE code = 'sales:write')),
((SELECT id FROM menus WHERE label = 'Sales' AND parent_id IS NULL),
    'Transactions', '/transactions', 'ClipboardList', 2,
    (SELECT id FROM permissions WHERE code = 'transactions:read')),
((SELECT id FROM menus WHERE label = 'Sales' AND parent_id IS NULL),
    'Invoices', '/invoices', 'FileText', 3,
    (SELECT id FROM permissions WHERE code = 'invoices:read'));

-- Inventory group
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
(NULL, 'Inventory', NULL, 'Archive', 3,
    (SELECT id FROM permissions WHERE code = 'products:read'));

INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
((SELECT id FROM menus WHERE label = 'Inventory' AND parent_id IS NULL),
    'Products', '/products', 'Package', 1,
    (SELECT id FROM permissions WHERE code = 'products:read')),
((SELECT id FROM menus WHERE label = 'Inventory' AND parent_id IS NULL),
    'Product Catalog', '/product-configs', 'Tag', 2,
    (SELECT id FROM permissions WHERE code = 'product-configs:read'));

-- Settings group
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
(NULL, 'Settings', NULL, 'Settings', 4,
    (SELECT id FROM permissions WHERE code = 'users:read'));

INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
((SELECT id FROM menus WHERE label = 'Settings' AND parent_id IS NULL),
    'Users', '/settings/users', 'Users', 1,
    (SELECT id FROM permissions WHERE code = 'users:read')),
((SELECT id FROM menus WHERE label = 'Settings' AND parent_id IS NULL),
    'Roles', '/settings/roles', 'Shield', 2,
    (SELECT id FROM permissions WHERE code = 'roles:read'));
