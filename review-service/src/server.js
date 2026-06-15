import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { authenticate, authorize } from './auth.js';
import { asyncHandler, errorHandler } from './errors.js';

const app = express();
const port = process.env.REVIEW_PORT || 3005;

app.use(cors());
app.use(express.json());

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/reviews/health', (req, res) => {
  res.json({ service: 'review-service', status: 'ok' });
});

app.post('/reviews', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const bookingResult = await query(
    `SELECT * FROM bookings
     WHERE id = $1 AND customer_id = $2 AND status = 'COMPLETED'`,
    [bookingId, req.user.userId]
  );
  const booking = bookingResult.rows[0];

  if (!booking) {
    return res.status(400).json({ message: 'Only completed bookings can be reviewed' });
  }

  const result = await query(
    `INSERT INTO reviews (booking_id, customer_id, vehicle_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [booking.id, req.user.userId, booking.vehicle_id, rating, comment]
  );

  return res.status(201).json(result.rows[0]);
}));

app.get('/reviews/vehicle/:vehicleId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM reviews WHERE vehicle_id = $1 ORDER BY id',
    [req.params.vehicleId]
  );
  return res.json(result.rows);
}));

app.get('/reviews/my', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM reviews WHERE customer_id = $1 ORDER BY id',
    [req.user.userId]
  );
  return res.json(result.rows);
}));

app.get('/ratings/vehicle/:vehicleId/average', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT vehicle_id, ROUND(AVG(rating), 2) AS average_rating, COUNT(*) AS review_count
     FROM reviews
     WHERE vehicle_id = $1
     GROUP BY vehicle_id`,
    [req.params.vehicleId]
  );

  return res.json(result.rows[0] || {
    vehicle_id: Number(req.params.vehicleId),
    average_rating: null,
    review_count: 0
  });
}));

app.delete('/reviews/:id', authenticate, authorize('STAFF'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM reviews WHERE id = $1 RETURNING *', [req.params.id]);

  if (!result.rowCount) return res.status(404).json({ message: 'Review not found' });
  return res.json({ message: 'Review deleted' });
}));

app.use(errorHandler);

initDb().then(() => {
  app.listen(port, () => console.log(`Review Service running on port ${port}`));
});
