import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { authenticate, authorize } from './auth.js';
import { asyncHandler, errorHandler } from './errors.js';

const app = express();
const port = process.env.OWNER_PORT || 3002;

app.use(cors());
app.use(express.json());

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER NOT NULL,
      brand VARCHAR(80) NOT NULL,
      model VARCHAR(80) NOT NULL,
      plate_number VARCHAR(40) UNIQUE NOT NULL,
      price_per_day NUMERIC(10, 2) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'UNAVAILABLE')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/owners/health', (req, res) => {
  res.json({ service: 'owner-service', status: 'ok' });
});

app.post('/owners/vehicles', authenticate, authorize('OWNER'), asyncHandler(async (req, res) => {
  const { brand, model, plateNumber, pricePerDay } = req.body;
  const result = await query(
    `INSERT INTO vehicles (owner_id, brand, model, plate_number, price_per_day)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.user.userId, brand, model, plateNumber, pricePerDay]
  );

  return res.status(201).json(result.rows[0]);
}));

app.get('/owners/vehicles', authenticate, authorize('OWNER', 'STAFF'), asyncHandler(async (req, res) => {
  const result = req.user.role === 'OWNER'
    ? await query('SELECT * FROM vehicles WHERE owner_id = $1 ORDER BY id', [req.user.userId])
    : await query('SELECT * FROM vehicles ORDER BY id');

  return res.json(result.rows);
}));

app.patch('/owners/vehicles/:id/price', authenticate, authorize('OWNER'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE vehicles SET price_per_day = $1
     WHERE id = $2 AND owner_id = $3
     RETURNING *`,
    [req.body.pricePerDay, req.params.id, req.user.userId]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Vehicle not found' });
  return res.json(result.rows[0]);
}));

app.patch('/owners/vehicles/:id/status', authenticate, authorize('OWNER'), asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE vehicles SET status = $1
     WHERE id = $2 AND owner_id = $3
     RETURNING *`,
    [req.body.status, req.params.id, req.user.userId]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Vehicle not found' });
  return res.json(result.rows[0]);
}));

app.delete('/owners/vehicles/:id', authenticate, authorize('OWNER'), asyncHandler(async (req, res) => {
  const result = await query(
    'DELETE FROM vehicles WHERE id = $1 AND owner_id = $2 RETURNING *',
    [req.params.id, req.user.userId]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Vehicle not found' });
  return res.json({ message: 'Vehicle deleted' });
}));

app.use(errorHandler);

initDb().then(() => {
  app.listen(port, () => console.log(`Owner Service running on port ${port}`));
});
