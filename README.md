# AquaBloom (fishStore)

AquaBloom is a portfolio full-stack storefront for freshwater fish, aquatic plants, and supplies.

This project demonstrates:
- multi-page frontend UX
- API-driven product rendering
- server-side validation
- persisted contact messages and orders
- automated API tests

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Persistence: JSON file database in `data/db.json`
- Tests: Vitest + Supertest

## Key Features

- Dynamic catalog fetched from `/api/products`
- Client cart with local persistence, live subtotal, and removal actions
- Checkout flow that posts orders to `/api/orders`
- Contact form that posts to `/api/contact` with server-side validation
- Responsive UI with accessible labels and live regions
- Safer DOM rendering without `innerHTML` for product and cart rows

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

`http://localhost:3000`

## Run Tests

```bash
npm test
```

## API Overview

### `GET /api/health`
Returns app health status.

### `GET /api/products`
Returns all products.

Optional query:
- `category=fish|plants|supplies`

### `POST /api/contact`
Stores a contact message.

Body:

```json
{
	"name": "Alex Rivers",
	"email": "alex@example.com",
	"message": "I need advice for a beginner planted tank setup."
}
```

Validation:
- name min 2 chars
- valid email format
- message min 10 chars

### `POST /api/orders`
Creates an order from cart item IDs.

Body:

```json
{
	"customerName": "Jamie Stone",
	"customerEmail": "jamie@example.com",
	"items": [
		{ "id": "fish-neon-tetra-6", "quantity": 2 },
		{ "id": "plant-guppy-grass", "quantity": 1 }
	]
}
```

The server computes totals from persisted product prices before saving.

## Project Structure

- `src/` frontend pages and UI logic
- `public/` static images
- `server/app.js` Express app and API routes
- `server/db.js` JSON persistence helpers
- `server/index.js` server entrypoint
- `data/db.json` seed products and persisted records
- `tests/api.test.js` integration tests

## Engineering Notes

- Cart data is intentionally client-side for session continuity, while orders/messages are persisted server-side.
- Order subtotal is always calculated by the backend to prevent client-side price tampering.
- Test coverage currently focuses on core API behavior: filtering, validation, and order totals.

## Deploy to Railway

1. Push the repo to GitHub.

2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select this repo.

3. Railway detects Node.js automatically via `package.json`. The included `railway.json` sets the start command and health-check path.

4. No environment variables are required for basic operation. Railway injects `PORT` automatically; the server reads it via `process.env.PORT`.

5. Once deployed, Railway provides a public URL (e.g. `https://aquabloom-production.up.railway.app`).

### Post-deploy checklist

- [ ] Homepage loads and hero image renders
- [ ] Fish, Plants, and Supplies catalog pages populate from the API
- [ ] "Add to Cart" updates the cart count in the nav
- [ ] Cart page shows items and allows removal
- [ ] Checkout form submits successfully and returns an order ID
- [ ] Contact form submits successfully and shows the confirmation message
- [ ] About page background image loads
- [ ] Site is responsive on mobile

### Notes

The JSON file database (`data/db.json`) is written to the container's ephemeral filesystem. Product seed data persists across requests within a single deployment, but messages and orders reset on each redeploy. This is expected for a portfolio demo.

## Next Improvements

- Add authentication and user-specific order history
- Add pagination/search endpoints for larger catalogs
- Add frontend E2E browser tests
