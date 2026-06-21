# Sundery BI — Vending Machine Sales Analytics

A full-stack business intelligence dashboard for vending machine operations. Tracks real-time sales, manages inventory, and sends automated stock alerts via Telegram.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 (Docker) |
| Migrations | Flyway 10 |
| Auth | JWT (access token 15m + refresh token 7d), bcryptjs |
| Notifications | Telegram Bot API (Node.js built-in `https`) |
| Package Manager | npm |

---

## Project Structure

```
sales_analysis/
├── start.sh                    # One-command bootstrap script
├── backend/
│   ├── .env                    # Environment variables
│   ├── db/
│   │   ├── migrations/         # Flyway SQL migrations (V1–V5)
│   │   ├── seed.js             # CSV product & invoice data seeder
│   │   └── seedAuth.js         # Roles, permissions, default users
│   └── src/
│       ├── server.js
│       ├── db.js               # pg Pool singleton
│       ├── controllers/        # posController, productController, …
│       ├── routes/             # Express routers
│       ├── middleware/         # authenticate, authorize
│       └── services/
│           ├── telegramService.js
│           └── stockAlertService.js
└── frontend/
    └── src/
        ├── pages/              # Dashboard, POS, Products, Roles, …
        ├── components/         # Header, Sidebar, Charts, …
        ├── context/            # AuthContext
        └── services/api.js     # Axios instance
```

---

## Database Tables

### Geography & Machines

| Table | Purpose |
|---|---|
| `organizations` | Top-level company/operator owning locations |
| `regions` | Geographical regions for grouping routes |
| `locations` | Physical deployment sites (malls, buildings) |
| `routes` | Service routes linking locations to regions |
| `vending_machines` | Individual machines, each assigned to a route |

### Products & Inventory

| Table | Purpose |
|---|---|
| `product_categories` | Product categories (Beverages, Snacks, …) |
| `product_configs` | Master product catalog — name, category, standard price, image. Single source of truth to prevent naming inconsistencies |
| `products` | Inventory instances linking to a `product_config`. Stores optional price override (`purchase_price`) and live `stock_qty` |
| `stock_movements` | Audit log of every stock change: `initial`, `restock`, `sale`, `adjustment`. Signed quantity (positive = in, negative = out) |
| `stock_alerts` | Deduplication log for Telegram notifications. Prevents duplicate alerts within the configured time window |

### Auth & Access Control

| Table | Purpose |
|---|---|
| `roles` | User roles: Admin, Viewer, Cashier (and custom roles) |
| `permissions` | Fine-grained permission codes, e.g. `products:read`, `sales:write` |
| `role_permissions` | Many-to-many mapping of roles to permissions |
| `users` | System users. Cashiers are assigned a `location_id` that scopes their POS sales |
| `menus` | Dynamic sidebar menu tree. Each item references a `permission_id` so the UI renders only what the user can access |
| `refresh_tokens` | Hashed refresh tokens for JWT rotation |

### Sales

| Table | Purpose |
|---|---|
| `invoices` | Sales records from both POS (`source='pos'`) and historical CSV imports (`source='historical'`). POS invoices have a `cashier_id`; historical invoices have a `vending_machine_id` |
| `invoice_items` | Line items for each invoice — product, quantity, unit price, subtotal |

---

## Default Users

| Email | Password | Role |
|---|---|---|
| admin@sundery.com | Admin1234 | Admin |
| viewer@sundery.com | Viewer1234 | Viewer |
| cashier@sundery.com | Cashier1234 | Cashier |
| cashier2@sundery.com | Cashier1234 | Cashier |

---

## How to Run

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — running
- [Node.js](https://nodejs.org/) 18+ with npm
- [Flyway CLI](https://flywaydb.org/) — pulled automatically via Docker during `start.sh`

### 1. Clone and configure

```bash
git clone <repo-url>
cd sales_analysis
```

Copy and fill in the environment file:

```bash
cp backend/.env.example backend/.env
```

Key variables in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5434
DB_USER=postgres
DB_PASSWORD=Admin
DB_NAME=sundery_sales

PORT=5000
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Optional — leave blank to disable Telegram alerts
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_LOW_STOCK_THRESHOLD=10
TELEGRAM_ALERT_DEDUP_HOURS=1
```

### 2. Start everything

```bash
bash start.sh
```

This single command will:
1. Start a PostgreSQL 16 container on port `5434`
2. Install npm dependencies for backend and frontend
3. Run Flyway migrations (V1 → V5)
4. Seed default roles, permissions, and users
5. Seed product catalog and historical sales data from CSV
6. Start the backend on `http://localhost:5000`
7. Start the frontend on `http://localhost:5173`

### 3. Open the app

Navigate to **http://localhost:5173** and log in with any of the default user accounts above.

### Fresh database reset

To wipe all data and start from scratch:

```bash
docker rm -f sundery_db_dev
bash start.sh
```

---

## Telegram Stock Alerts (Optional)

When configured, the system automatically sends messages to a Telegram chat when products go low or out of stock.

**Setup:**
1. Open Telegram → search `@BotFather` → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`
2. Add the bot to your group or channel
3. Get the chat ID by visiting:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
   Send a message in the group first, then find `"chat":{"id": ...}` in the response
4. Paste the chat ID into `TELEGRAM_CHAT_ID` and restart the server

**Test the connection:**
```
POST /api/telegram/test
Authorization: Bearer <admin-token>
```

Alerts retry automatically with exponential backoff (2s → 6s → 18s) and are deduplicated per product per hour to prevent spam.

---

## Role Permissions Summary

| Permission | Admin | Viewer | Cashier |
|---|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ |
| Point of Sale | ✓ | | ✓ |
| Transactions | ✓ | ✓ | |
| Invoices | ✓ | ✓ | ✓ |
| Products (read) | ✓ | ✓ | ✓ |
| Products (write) | ✓ | | |
| Product Catalog (read) | ✓ | ✓ | ✓ |
| Product Catalog (write) | ✓ | | |
| Users | ✓ | | |
| Roles | ✓ | | |
