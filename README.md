# api

**Primary REST API** for ShopWorthy — Node.js 20 + Express, SQLite backend. Handles auth, products, cart, and orders; orchestrates calls to inventory and payments services.

Part of the [ShopWorthy](https://github.com/ShopWorthy) organization.

## Technology

| Item | Choice |
|------|--------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (`jsonwebtoken`) |
| Language | JavaScript (CommonJS) |

## Prerequisites

- Node.js 20+
- npm or yarn

## Setup

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

Or:

```bash
node src/index.js
```

The API will be available at **http://localhost:4000**. It expects inventory at **http://localhost:5000** and payments at **http://localhost:6000** when running locally.

## Build / Docker

```bash
docker build -t shopworthy-api .
docker run -p 4000:4000 shopworthy-api
```

## Port

| Environment | Port |
|-------------|------|
| API server | 4000 |

## Related Repositories

- [frontend](https://github.com/ShopWorthy/frontend) — Customer storefront (consumes this API)
- [inventory](https://github.com/ShopWorthy/inventory) — Inventory microservice
- [payments](https://github.com/ShopWorthy/payments) — Payment microservice
- [infra](https://github.com/ShopWorthy/infra) — Full stack via Docker Compose
