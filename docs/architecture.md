# Vehicle Renting System Architecture

## Title

Vehicle Renting System using Express Microservices, JWT RBAC, API Gateway, Docker, and Neon PostgreSQL.

## Architecture

All client requests go through the API Gateway:

```txt
Postman / Client
      |
      v
API Gateway :3000
      |
      +-- Auth Service :3001
      +-- Owner Service :3002
      +-- Customer Service :3003
      +-- Payment Service :3004
      +-- Review & Rating Service :3005
      |
      v
Neon PostgreSQL
```

## Microservices and APIs

### 1. API Gateway

- `GET /health`
- Proxies `/auth/*` to Auth Service
- Proxies `/owners/*` to Owner Service
- Proxies `/customers/*` to Customer Service
- Proxies `/payments/*` to Payment Service
- Proxies `/reviews/*` and `/ratings/*` to Review & Rating Service
- Applies rate limiting
- Supports round-robin load balancing with comma-separated service URLs

### 2. Registration/Login Service

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/users` - STAFF only

Database table:

- `users`

### 3. Owner Service

- `POST /owners/vehicles` - OWNER only
- `GET /owners/vehicles` - OWNER or STAFF
- `PATCH /owners/vehicles/:id/price` - OWNER only
- `PATCH /owners/vehicles/:id/status` - OWNER only
- `DELETE /owners/vehicles/:id` - OWNER only

Database table:

- `vehicles`

### 4. Customer Service

- `GET /customers/vehicles/search` - CUSTOMER or STAFF
- `POST /customers/bookings` - CUSTOMER only
- `GET /customers/bookings` - CUSTOMER or STAFF
- `PATCH /customers/bookings/:id/cancel` - CUSTOMER only
- `PATCH /customers/bookings/:id/complete` - STAFF only

Database table:

- `bookings`

### 5. Payment Service

- `POST /payments/pay` - CUSTOMER only
- `GET /payments` - STAFF only
- `GET /payments/my` - CUSTOMER only
- `PATCH /payments/:id/refund` - STAFF only

Database table:

- `payments`

### 6. Review & Rating Service

- `POST /reviews` - CUSTOMER only
- `GET /reviews/vehicle/:vehicleId`
- `GET /reviews/my` - CUSTOMER only
- `GET /ratings/vehicle/:vehicleId/average`
- `DELETE /reviews/:id` - STAFF only

Database table:

- `reviews`

## RBAC Rules

- CUSTOMER can search, book, cancel, pay, and review.
- OWNER can add vehicles and update vehicle price/status.
- STAFF can view users, bookings, payments, complete bookings, refund payments, and delete reviews.

## Deployment Plan

Maximum 3/4 EC2 instances can still run 6 services:

- EC2 1: API Gateway and Auth Service
- EC2 2: Owner Service and Customer Service
- EC2 3: Payment Service and Review Service
- Neon: managed PostgreSQL database

Runtime version:

- Node.js 24 LTS using `node:24-alpine`
- No `latest` Docker tag
- Exact npm dependency versions in each microservice

For load balancing demonstration, run a second instance of one service and set:

```txt
OWNER_SERVICE_URL=http://ec2-instance-a:3002,http://ec2-instance-b:3002
```

## Service Folder Structure

Each microservice is independently deployable and contains:

```txt
service-name/
  src/
  package.json
  Dockerfile
  .env.example
  .dockerignore
```

The root folder keeps only project-level orchestration and documentation:

```txt
docker-compose.yml
README.md
docs/
```
