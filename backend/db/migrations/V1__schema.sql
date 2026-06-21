-- ============================================================
-- V1: Complete schema — organizations, products, auth, sales
-- ============================================================

-- ── Geography ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS regions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    region_id   INT NOT NULL REFERENCES regions(id)
);

CREATE TABLE IF NOT EXISTS vending_machines (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    device_category VARCHAR(100),
    route_id        INT NOT NULL REFERENCES routes(id)
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL UNIQUE,
    category_id    INT          NOT NULL REFERENCES product_categories(id),
    purchase_price NUMERIC(10,2) NOT NULL,
    image_url      VARCHAR(500)
);

-- ── Auth ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role_id       INT          NOT NULL REFERENCES roles(id),
    location_id   INT          REFERENCES locations(id) ON DELETE SET NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
    id            SERIAL PRIMARY KEY,
    parent_id     INT REFERENCES menus(id) ON DELETE CASCADE,
    label         VARCHAR(100) NOT NULL,
    path          VARCHAR(255),
    icon          VARCHAR(50),
    sort_order    INT          NOT NULL DEFAULT 0,
    permission_id INT REFERENCES permissions(id),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Sales (unified: POS + historical CSV) ────────────────────
-- source = 'pos'        → created by a cashier via POS
-- source = 'historical' → imported from CSV dataset
CREATE TABLE IF NOT EXISTS invoices (
    id                 SERIAL        PRIMARY KEY,
    receipt_no         VARCHAR(100)  NOT NULL UNIQUE,
    cashier_id         INT           REFERENCES users(id),            -- NULL for historical
    vending_machine_id INT           REFERENCES vending_machines(id), -- NULL for POS
    location_id        INT           NOT NULL REFERENCES locations(id),
    payment_type       VARCHAR(50),
    payment_status     VARCHAR(50)   NOT NULL DEFAULT 'completed',
    subtotal           NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount           NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    source             VARCHAR(20)   NOT NULL DEFAULT 'pos',
    notes              TEXT,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id         SERIAL        PRIMARY KEY,
    invoice_id INT           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INT           NOT NULL REFERENCES products(id),
    quantity   INT           NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal   NUMERIC(10,2) NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_cashier   ON invoices(cashier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_location  ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created   ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_source    ON invoices(source);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv  ON invoice_items(invoice_id);
