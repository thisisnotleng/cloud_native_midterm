# Vehicle Renting System - Cloud Native Midterm

## Microservices

1. API Gateway - routes all API calls, applies rate limiting, and supports round-robin load balancing.
2. Registration/Login Service - registration, login, JWT, user listing for staff.
3. Owner Service - owner vehicle CRUD, price update, availability update.
4. Customer Service - vehicle search, booking, cancel booking, complete booking by staff.
5. Payment Service - mock payment, customer payment history, staff payment view.
6. Review & Rating Service - review completed rentals and calculate vehicle average rating.

All calls should be made through the API Gateway at `http://localhost:3000`.

## Setup

```bash
cp .env.example .env
npm install
npm run install:all
npm run dev
```

Set `DATABASE_URL` in `.env` to your Neon PostgreSQL connection string.

## Version Policy

- Node.js uses `24.x` LTS in Docker: `node:24-alpine`.
- `package.json` engines use `>=24 <25`.
- Dependency versions are pinned without `^` to avoid accidental latest-version upgrades.
- Nginx is not required yet because the API Gateway handles routing, rate limiting, and simple round-robin load balancing.

Each microservice also has its own `package.json`, `Dockerfile`, and `.env.example` so it can be deployed independently:

```txt
api-gateway/
auth-service/
owner-service/
customer-service/
payment-service/
review-service/
```

Runtime version policy is documented in [docs/version-policy.md](docs/version-policy.md). Docker images use Node.js 24 LTS, not `latest`.

## Roles

- `CUSTOMER`: search vehicles, book, cancel, pay, review.
- `OWNER`: create and manage vehicles.
- `STAFF`: view users, bookings, payments, delete reviews, complete bookings.

## Main API Routes Through Gateway

### Auth Service

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/users` - STAFF only

### Owner Service

- `POST /owners/vehicles` - OWNER only
- `GET /owners/vehicles` - OWNER or STAFF
- `PATCH /owners/vehicles/:id/price` - OWNER only
- `PATCH /owners/vehicles/:id/status` - OWNER only
- `DELETE /owners/vehicles/:id` - OWNER only

### Customer Service

- `GET /customers/vehicles/search`
- `POST /customers/bookings` - CUSTOMER only
- `GET /customers/bookings` - CUSTOMER or STAFF
- `PATCH /customers/bookings/:id/cancel` - CUSTOMER only
- `PATCH /customers/bookings/:id/complete` - STAFF only

### Payment Service

- `POST /payments/pay` - CUSTOMER only
- `GET /payments` - STAFF only
- `GET /payments/my` - CUSTOMER only
- `PATCH /payments/:id/refund` - STAFF only

### Review & Rating Service

- `POST /reviews` - CUSTOMER only, completed bookings only
- `GET /reviews/vehicle/:vehicleId`
- `GET /reviews/my` - CUSTOMER only
- `GET /ratings/vehicle/:vehicleId/average`
- `DELETE /reviews/:id` - STAFF only

## Screenshot Testing Checklist

- Wrong UID or password: call `POST /auth/login` with a bad password.
- Invalid token: call any protected route with `Authorization: Bearer wrong-token`.
- Unauthorized role: use a CUSTOMER token on `POST /owners/vehicles` or OWNER token on `GET /payments`.
- Gateway usage: show every Postman request using `localhost:3000`.
- Database schema: screenshot each `CREATE TABLE` block in service code.
- Rate limit: screenshot API Gateway `express-rate-limit` code.
- Load balancing: screenshot API Gateway `roundRobin` code.
