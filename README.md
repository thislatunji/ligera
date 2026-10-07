# Ligeria Brand Experience

Fullstack home fragrance e-commerce web application for **Ligeria** ("Illuminate every space"), crafting scented candles, reed diffusers, room sprays, and gypsum decor in Lagos, Nigeria.

This repository is split into two completely decoupled, self-contained directories designed for independent containerized deployments:
- **`frontend/`**: Vite + React 19 SPA served via Nginx (or any static host)
- **`backend/`**: Express + Node.js 22 + TypeScript REST API with Supabase integration

---

## Architecture & Directory Structure

```
ligeria-scent-glow/
├── docker-compose.yml     # Compose file to orchestrate both containers locally/staging
├── README.md              # Deployment and API documentation
│
├── frontend/              # Standalone Frontend Container Service
│   ├── Dockerfile         # Multi-stage Docker build (Node builder -> Nginx runner)
│   ├── .dockerignore
│   ├── nginx.conf         # Nginx SPA fallback configuration
│   ├── index.html         # HTML entry with brand fonts & SEO tags
│   ├── vite.config.ts     # Vite configuration
│   ├── package.json       # Self-contained frontend dependencies
│   ├── tsconfig.json
│   ├── .env / .env.example
│   ├── public/            # Static assets (favicons, robots.txt)
│   └── src/               # React application (routes, components, hooks, styles)
│
└── backend/               # Standalone Backend Container Service
    ├── Dockerfile         # Multi-stage Docker build (Node builder -> Node runner)
    ├── .dockerignore
    ├── package.json       # Self-contained backend dependencies
    ├── tsconfig.json
    ├── .env / .env.example
    ├── supabase/          # Supabase configuration & migrations
    └── src/               # Express server (routes, middleware, config, types)
```

---

## 1. Backend Container (`backend/`)

The backend is an independent Node.js + Express API server with Supabase integration.

### Configuration (`backend/.env`)
```env
PORT=5001
SUPABASE_URL="https://<project-id>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-or-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-optional>"
CORS_ORIGIN="http://localhost:3000,http://localhost:80"
```

### Local Development (without Docker)
```sh
cd backend
npm install
npm run dev      # starts with tsx watch on port 5001
```

### Building & Running the Backend Container
```sh
cd backend

# Build Docker image
docker build -t ligeria-backend .

# Run container
docker run -p 5001:5001 --env-file .env ligeria-backend
```

---

## 2. Frontend Container (`frontend/`)

The frontend is an independent Vite React SPA built into static assets and served by an Nginx container.

### Configuration (`frontend/.env`)
```env
VITE_SUPABASE_PROJECT_ID="<project-id>"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
VITE_SUPABASE_URL="https://<project-id>.supabase.co"
# In local dev Vite proxies /api to http://localhost:5001 automatically.
# Set VITE_API_URL in production if backend is hosted on a custom domain.
# VITE_API_URL="https://api.yourdomain.com"
```

### Local Development (without Docker)
```sh
cd frontend
npm install
npm run dev      # starts Vite on port 3000
```

### Building & Running the Frontend Container
```sh
cd frontend

# Build Docker image
docker build -t ligeria-frontend .

# Run container
docker run -p 3000:80 ligeria-frontend
```

---

## 3. Running Both with Docker Compose

To test both isolated containers together locally:

```sh
docker compose up --build
```

- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5001`
- **Health Check**: `http://localhost:5001/api/health`

---

## Backend API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Health check | No |
| `GET` | `/api/products` | Active products with signed image URLs | No |
| `POST` | `/api/orders` | Place customer order & reduce inventory | No |
| `GET` | `/api/admin/me` | Check admin privileges | Yes (Bearer) |
| `GET` | `/api/admin/products` | All products with inventory alert levels | Yes (Bearer) |
| `POST` | `/api/admin/products` | Create or update product | Yes (Bearer) |
| `DELETE` | `/api/admin/products/:id` | Delete product | Yes (Bearer) |
| `POST` | `/api/admin/products/:id/stock` | Update stock and low stock thresholds | Yes (Bearer) |
| `GET` | `/api/admin/orders` | List customer orders and line items | Yes (Bearer) |
| `PATCH` | `/api/admin/orders/:id/status` | Update order status | Yes (Bearer) |
| `PATCH` | `/api/admin/orders/items/:itemId/fulfillment` | Update line item fulfillment count | Yes (Bearer) |
