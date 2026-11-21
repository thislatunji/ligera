# Ligera Brand Experience

Fullstack home fragrance e-commerce web application for **Ligera** ("Illuminate every space"), crafting scented candles, reed diffusers, room sprays, and gypsum decor in Lagos, Nigeria.

The storefront, admin portal, and REST API live together in a single **Next.js 15 App Router** application (`ligera-web`) inside `web/`, backed by MongoDB (Mongoose), Flutterwave, Cloudinary, and Resend.

---

## Directory Structure

```text
ligera/
├── docker-compose.yml     # Single `web` service definition
├── README.md              # Project overview, setup, and API summary
├── workflows/             # Engineering specs, contracts, and implementation plans
└── web/                   # Unified Next.js 15 fullstack app (`ligera-web`)
    ├── instrumentation.ts # Next.js startup hook (scheduler initialization)
    ├── middleware.ts      # Request middleware
    ├── next.config.ts     # Next.js configuration
    ├── package.json       # App dependencies and scripts
    ├── public/            # Static media and public assets
    ├── scripts/           # Database migrations and seed scripts
    ├── tests/             # Vitest test suite
    └── src/
        ├── app/           # App Router pages (storefront, /admin) & /api/* handlers
        ├── components/    # UI, storefront, motion, and admin components
        └── lib/           # DB models, services, auth, and validation schemas
```

---

## Local Development

```sh
cd web
npm install
npm run dev      # starts Next.js dev server on http://localhost:3000
```

Other scripts run from `web/`:

```sh
npm test         # run Vitest suite
npm run build    # build Next.js production bundle
npm start        # start Next.js production server on port 3000
```

---

## Configuration (`web/.env`)

Configure environment variables in `web/.env`:

```env
# Database & Auth
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>/<db>"
JWT_ACCESS_SECRET="<access-secret>"
JWT_REFRESH_SECRET="<refresh-secret>"
APP_URL="http://localhost:3000"

# Flutterwave Payments
FLW_SECRET_KEY="<flutterwave-secret-key>"
FLW_SECRET_HASH="<flutterwave-webhook-hash>"
FLW_REDIRECT_URL="http://localhost:3000/custom-requests/thanks"

# Cloudinary Media
CLOUDINARY_CLOUD_NAME="<cloud-name>"
CLOUDINARY_API_KEY="<api-key>"
CLOUDINARY_API_SECRET="<api-secret>"

# Resend Email
RESEND_API_KEY="<resend-api-key>"
EMAIL_FROM="Ligera <orders@yourdomain.com>"

# Background Scheduler
ENABLE_SCHEDULER="true"

# Optional Owner Seed Script (`scripts/seed-owner.ts`)
OWNER_EMAIL="<owner-email>"
OWNER_NAME="<owner-name>"
OWNER_PASSWORD="<owner-password>"
```

---

## Running with Docker Compose

```sh
docker compose up --build
```

- **App URL**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/api/health`

---

## API Routes Overview

All route handlers are served under `web/src/app/api/`:

- **Storefront & Public**
  - `GET /api/health` — application and database health check
  - `GET /api/products`, `GET /api/products/[slug]` — catalog listings and product details
  - `GET /api/categories`, `GET /api/delivery-zones`, `GET /api/search/suggest`, `GET /api/content/[slug]` — taxonomy, delivery zones, search suggestions, and CMS pages
  - `POST /api/checkout/quote`, `POST /api/checkout/orders`, `POST /api/orders/lookup` — checkout quoting, order placement, and customer order lookup
  - `POST /api/custom-requests` — custom/bespoke order inquiry submission
  - `POST /api/webhooks/flutterwave` — signed Flutterwave payment webhook
- **Authentication (`/api/auth/*`)**
  - `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`
  - `POST /api/auth/2fa/setup`, `POST /api/auth/2fa/enable`
  - `POST /api/auth/password/request-reset`, `POST /api/auth/password/confirm-reset`
- **Admin (`/api/admin/*`)**
  - Protected management endpoints for `dashboard`, `products` (CRUD, variants, stock, CSV import/export), `categories`, `orders` (status, verification, cancel, refund, packing slip, CSV export), `custom-requests`, `customers`, `delivery-zones`, `content`, `notifications`, `settings`, `uploads/sign`, and `activity-logs`.
