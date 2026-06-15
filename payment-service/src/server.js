import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { authenticate, authorize } from './auth.js';
import { asyncHandler, errorHandler } from './errors.js';

const app = express();
const port = process.env.PAYMENT_PORT || 3004;

app.use(cors());
app.use(express.json());

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      method VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PAID'
        CHECK (status IN ('PAID', 'FAILED', 'REFUNDED')),
      paid_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/payments/health', (req, res) => {
  res.json({ service: 'payment-service', status: 'ok' });
});

app.post('/payments/pay', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const { bookingId, method = 'MOCK_CARD' } = req.body;
  const bookingResult = await query(
    `SELECT * FROM bookings
     WHERE id = $1 AND customer_id = $2 AND status = 'BOOKED'`,
    [bookingId, req.user.userId]
  );
  const booking = bookingResult.rows[0];

  if (!booking) return res.status(404).json({ message: 'Booking not found for payment' });

  const result = await query(
    `INSERT INTO payments (booking_id, customer_id, amount, method)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [booking.id, req.user.userId, booking.total_price, method]
  );

  return res.status(201).json(result.rows[0]);
}));

app.get('/payments', authenticate, authorize('STAFF'), asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM payments ORDER BY id');
  return res.json(result.rows);
}));

app.get('/payments/my', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM payments WHERE customer_id = $1 ORDER BY id',
    [req.user.userId]
  );
  return res.json(result.rows);
}));

app.patch('/payments/:id/refund', authenticate, authorize('STAFF'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE payments SET status = 'REFUNDED'
     WHERE id = $1
     RETURNING *`,
    [req.params.id]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Payment not found' });
  return res.json(result.rows[0]);
}));

app.use(errorHandler);

initDb().then(() => {
  app.listen(port, () => console.log(`Payment Service running on port ${port}`));
});
