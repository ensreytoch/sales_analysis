-- ============================================================
-- V2: Seed roles, permissions, menus
-- Users are seeded via backend/db/seedAuth.js (requires bcrypt)
-- CSV data  is seeded via backend/db/seed.js
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
    ('Admin',   'Full system access'),
    ('Viewer',  'Read-only dashboard access'),
    ('Cashier', 'Point of sale operator assigned to a location')
ON CONFLICT (name) DO NOTHING;

-- ── Permissions ──────────────────────────────────────────────
INSERT INTO permissions (name, code) VALUES
    ('View Dashboard',    'dashboard:read'),
    ('View Users',        'users:read'),
    ('Manage Users',      'users:write'),
    ('View Roles',        'roles:read'),
    ('Manage Roles',      'roles:write'),
    ('View Menus',        'menus:read'),
    ('View Transactions', 'transactions:read'),
    ('Process Sales',     'sales:write'),
    ('View Invoices',     'invoices:read')
ON CONFLICT (code) DO NOTHING;

-- ── Role → Permissions ───────────────────────────────────────
-- Admin → all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- Viewer → dashboard + invoices
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Viewer' AND p.code IN ('dashboard:read', 'invoices:read')
ON CONFLICT DO NOTHING;

-- Cashier → dashboard + POS + transactions + invoices
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Cashier'
  AND p.code IN ('dashboard:read', 'sales:write', 'transactions:read', 'invoices:read')
ON CONFLICT DO NOTHING;

-- ── Menu tree ────────────────────────────────────────────────
INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
    (NULL, 'Dashboard',     '/dashboard',    'LayoutDashboard', 1,
        (SELECT id FROM permissions WHERE code = 'dashboard:read')),
    (NULL, 'Point of Sale', '/pos',          'ShoppingCart',    2,
        (SELECT id FROM permissions WHERE code = 'sales:write')),
    (NULL, 'Transactions',  '/transactions', 'ClipboardList',   3,
        (SELECT id FROM permissions WHERE code = 'transactions:read')),
    (NULL, 'Invoices',      '/invoices',     'FileText',        4,
        (SELECT id FROM permissions WHERE code = 'invoices:read')),
    (NULL, 'Settings',      NULL,            'Settings',        5,
        (SELECT id FROM permissions WHERE code = 'users:read'))
ON CONFLICT DO NOTHING;

INSERT INTO menus (parent_id, label, path, icon, sort_order, permission_id) VALUES
    ((SELECT id FROM menus WHERE label = 'Settings' AND parent_id IS NULL),
        'Users', '/settings/users', 'Users',  1,
        (SELECT id FROM permissions WHERE code = 'users:read')),
    ((SELECT id FROM menus WHERE label = 'Settings' AND parent_id IS NULL),
        'Roles', '/settings/roles', 'Shield', 2,
        (SELECT id FROM permissions WHERE code = 'roles:read'))
ON CONFLICT DO NOTHING;
