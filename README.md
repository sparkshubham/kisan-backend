# Kisan Mall Backend

Node.js + Express + PostgreSQL API for all three Kisan Mall apps:

| App | Frontend port | API prefix |
|-----|---------------|------------|
| Customer | 5173 | `/api/customer` |
| Admin | 5174 | `/api/admin` |
| Staff (Packer + Delivery) | 5175 | `/api/staff` |

**API server:** `https://kisan-backend-ten.vercel.app`

Health check: `GET https://kisan-backend-ten.vercel.app/api/health`

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

Create the database:

```sql
CREATE DATABASE kisanmall;
```

### 2. Install & configure

```bash
cd backend
npm install
copy .env.example .env
```

Edit `.env` / Vercel env. The API resolves the DB URL in this order:

**Runtime (app):** `POSTGRES_URL` → `POSTGRES_PRISMA_URL` → `DATABASE_URL` → built from `POSTGRES_USER` + `POSTGRES_PASSWORD` + `POSTGRES_HOST` + `POSTGRES_DATABASE`

**Migrations / seed:** `POSTGRES_URL_NON_POOLING` → `DATABASE_URL` → `POSTGRES_URL` → parts

```
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=postgres
POSTGRES_HOST=db.xxxxx.supabase.co
POSTGRES_PASSWORD=your-password
POSTGRES_DATABASE=postgres
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

On Vercel, link the Supabase integration so these variables are injected automatically.

### 3. Setup database

```bash
npm run db:setup
```

This runs migrations (schema) and seeds default settings.

**On Vercel:** schema also runs automatically via:
1. `build` / `db:migrate` during deploy (`vercel.json` buildCommand)
2. `ensureSchema()` on cold start and first API request

You do **not** need to SSH in and migrate manually after each push (as long as DB env vars are set).

### 4. Start server

```bash
npm run dev
```

Local health check: `GET http://localhost:3000/api/health`  
Deployed health check: `GET https://kisan-backend-ten.vercel.app/api/health`  
Swagger docs: `http://localhost:3000/api/docs` · `https://kisan-backend-ten.vercel.app/api/docs`  
OpenAPI JSON: `/api/docs.json`

---

## Demo Credentials

### Customer (OTP login)
- Any 10-digit mobile number
- OTP: `123456` (logged to console in dev)

### Admin
- Email: `admin@kisanmall.com`
- Password: `admin123`

### Staff
| Role | Mobile | PIN |
|------|--------|-----|
| Packer | `9999900001` | `1234` |
| Delivery Boy | `9999900002` | `1234` |

---

## API Overview

### Customer — `/api/customer`

```
POST   /auth/otp/send
POST   /auth/otp/verify
GET    /auth/me
GET    /categories
GET    /products
GET    /products/:id
GET    /products/search?q=
GET    /delivery-slots
GET    /banners
POST   /coupons/validate
GET    /addresses
POST   /addresses
POST   /orders
GET    /orders
GET    /orders/:id/tracking
POST   /orders/:id/review
GET    /wishlist
GET    /notifications
```

### Admin — `/api/admin`

```
POST   /auth/login
GET    /dashboard/stats
GET    /products
POST   /products
PATCH  /orders/:id/status
POST   /orders/:id/assign-delivery
GET    /customers
PATCH  /inventory/products/:id/stock
GET    /coupons, /offers, /banners, /delivery-slots
GET    /payments, /refunds, /support/tickets, /reviews
POST   /notifications/send
GET    /reports/sales
GET    /settings
GET    /users
```

All admin routes require `Authorization: Bearer <token>`.

### Staff — `/api/staff`

**Packer** (`role: packer`):
```
GET    /packer/orders
GET    /packer/orders/counts
PATCH  /packer/orders/:id/status
POST   /packer/orders/:id/items/:itemId/scan
```

**Delivery** (`role: delivery_boy`):
```
GET    /delivery/orders
POST   /delivery/orders/:id/accept
POST   /delivery/orders/:id/start
POST   /delivery/orders/:id/verify-otp
POST   /delivery/orders/:id/complete
PATCH  /delivery/profile/online
GET    /delivery/earnings
```

---

## Order Status Flow

```
Customer places order → placed → confirmed
Packer picks         → preparing (packer_status: picking → packing → ready)
Admin assigns        → ready + delivery_status: assigned
Delivery accepts     → picked_up → out_for_delivery → delivered
```

---

## Project Structure

```
backend/
├── sql/schema.sql          # PostgreSQL schema
├── scripts/
│   ├── migrate.js          # Apply schema
│   └── seed.js             # Demo data
└── src/
    ├── server.js
    ├── app.js
    ├── config/             # DB + env
    ├── db/                 # Auto schema ensure (deploy/cold start)
    ├── docs/               # Swagger / OpenAPI
    ├── middleware/         # Auth + errors
    ├── services/           # Order helpers
    └── routes/
├── api/index.js            # Vercel serverless entry
└── vercel.json             # Deploy + migrate on build
        ├── customer/
        ├── admin/
        └── staff/
```

---

## Frontend Integration

Add to each app's `.env`:

```env
VITE_API_BASE_URL=https://kisan-backend-ten.vercel.app/api
```

Replace Context/localStorage calls with fetch/axios to the API endpoints above.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm start` | Production start |
| `npm run db:migrate` | Apply schema |
| `npm run db:seed` | Seed demo data |
| `npm run db:setup` | Migrate + seed |
