import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { authenticate, authorize, signToken } from './auth.js';
import { asyncHandler, errorHandler } from './errors.js';

const app = express();
const port = process.env.AUTH_PORT || 3001;

app.use(cors());
app.use(express.json());

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'OWNER', 'STAFF')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

app.get('/auth/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'ok' });
});

app.post('/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password, role = 'CUSTOMER' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  );

  return res.status(201).json(result.rows[0]);
}));

app.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ message: 'Wrong UID or password' });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}));

app.get('/auth/me', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user.userId]
  );

  return res.json(result.rows[0]);
}));

app.get('/auth/users', authenticate, authorize('STAFF'), asyncHandler(async (req, res) => {
  const result = await query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
  return res.json(result.rows);
}));

app.use(errorHandler);

initDb().then(() => {
  app.listen(port, () => console.log(`Auth Service running on port ${port}`));
});
