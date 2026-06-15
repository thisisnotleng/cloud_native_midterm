# Postman Testing Flow

Use only the gateway URL:

```txt
http://localhost:3000
```

## 1. Create Users

Customer:

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Customer One",
  "email": "customer@test.com",
  "password": "password123",
  "role": "CUSTOMER"
}
```

Owner:

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Owner One",
  "email": "owner@test.com",
  "password": "password123",
  "role": "OWNER"
}
```

Staff:

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Staff One",
  "email": "staff@test.com",
  "password": "password123",
  "role": "STAFF"
}
```

## 2. Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "owner@test.com",
  "password": "password123"
}
```

Save the JWT token and use it as:

```txt
Authorization: Bearer YOUR_TOKEN
```

## 3. Owner Adds Vehicle

```http
POST /owners/vehicles
Authorization: Bearer OWNER_TOKEN
Content-Type: application/json

{
  "brand": "Toyota",
  "model": "Prius",
  "plateNumber": "2AB-1234",
  "pricePerDay": 35
}
```

## 4. Customer Searches Vehicles

```http
GET /customers/vehicles/search?keyword=toyota&maxPrice=50
Authorization: Bearer CUSTOMER_TOKEN
```

## 5. Customer Books Vehicle

```http
POST /customers/bookings
Authorization: Bearer CUSTOMER_TOKEN
Content-Type: application/json

{
  "vehicleId": 1,
  "startDate": "2026-06-20",
  "endDate": "2026-06-23"
}
```

## 6. Customer Pays

```http
POST /payments/pay
Authorization: Bearer CUSTOMER_TOKEN
Content-Type: application/json

{
  "bookingId": 1,
  "method": "MOCK_CARD"
}
```

## 7. Staff Views Payments

```http
GET /payments
Authorization: Bearer STAFF_TOKEN
```

## 8. Staff Completes Booking

```http
PATCH /customers/bookings/1/complete
Authorization: Bearer STAFF_TOKEN
```

## 9. Customer Adds Review

```http
POST /reviews
Authorization: Bearer CUSTOMER_TOKEN
Content-Type: application/json

{
  "bookingId": 1,
  "rating": 5,
  "comment": "Clean vehicle and smooth rental."
}
```

## Required Negative Tests

Wrong UID or password:

```http
POST /auth/login

{
  "email": "customer@test.com",
  "password": "wrong"
}
```

Invalid token:

```http
GET /customers/bookings
Authorization: Bearer wrong-token
```

Unauthorized role:

```http
POST /owners/vehicles
Authorization: Bearer CUSTOMER_TOKEN
```
