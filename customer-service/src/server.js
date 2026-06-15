import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { authenticate, authorize } from './auth.js';
import { asyncHandler, errorHandler } from './errors.js';

const app = express();
const port = process.env.CUSTOMER_PORT || 3003;

app.use(cors());
app.use(express.json());

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price NUMERIC(10, 2) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'BOOKED'
        CHECK (status IN ('BOOKED', 'CANCELLED', 'COMPLETED')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/customers/health', (req, res) => {
  res.json({ service: 'customer-service', status: 'ok' });
});

app.get('/customers/vehicles/search', authenticate, authorize('CUSTOMER', 'STAFF'), asyncHandler(async (req, res) => {
  const { keyword = '', maxPrice } = req.query;
  const params = [`%${keyword}%`];
  let sql = `
    SELECT * FROM vehicles
    WHERE status = 'AVAILABLE'
    AND (brand ILIKE $1 OR model ILIKE $1 OR plate_number ILIKE $1)
  `;

  if (maxPrice) {
    params.push(maxPrice);
    sql += ` AND price_per_day <= $${params.length}`;
  }

  sql += ' ORDER BY price_per_day ASC';
  const result = await query(sql, params);
  return res.json(result.rows);
}));

app.post('/customers/bookings', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const { vehicleId, startDate, endDate } = req.body;
  const vehicleResult = await query(
    `SELECT * FROM vehicles WHERE id = $1 AND status = 'AVAILABLE'`,
    [vehicleId]
  );
  const vehicle = vehicleResult.rows[0];

  if (!vehicle) return res.status(404).json({ message: 'Vehicle not available' });

  const days = Math.max(
    1,
    Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
  );
  const totalPrice = Number(vehicle.price_per_day) * days;

  const result = await query(
    `INSERT INTO bookings (customer_id, vehicle_id, start_date, end_date, total_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.user.userId, vehicleId, startDate, endDate, totalPrice]
  );

  return res.status(201).json(result.rows[0]);
}));

app.get('/customers/bookings', authenticate, authorize('CUSTOMER', 'STAFF'), asyncHandler(async (req, res) => {
  const result = req.user.role === 'CUSTOMER'
    ? await query('SELECT * FROM bookings WHERE customer_id = $1 ORDER BY id', [req.user.userId])
    : await query('SELECT * FROM bookings ORDER BY id');

  return res.json(result.rows);
}));

app.patch('/customers/bookings/:id/cancel', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE bookings SET status = 'CANCELLED'
     WHERE id = $1 AND customer_id = $2 AND status = 'BOOKED'
     RETURNING *`,
    [req.params.id, req.user.userId]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Active booking not found' });
  return res.json(result.rows[0]);
}));

app.patch('/customers/bookings/:id/complete', authenticate, authorize('STAFF'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE bookings SET status = 'COMPLETED'
     WHERE id = $1 AND status = 'BOOKED'
     RETURNING *`,
    [req.params.id]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Active booking not found' });
  return res.json(result.rows[0]);
}));

app.use(errorHandler);

initDb().then(() => {
  app.listen(port, () => console.log(`Customer Service running on port ${port}`));
});
