import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = process.env.GATEWAY_PORT || 3000;

app.use(cors());
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

function serviceTargets(value, fallback) {
  return (value || fallback).split(',').map((target) => target.trim());
}

function roundRobin(targets) {
  let index = 0;
  return () => {
    const target = targets[index % targets.length];
    index += 1;
    return target;
  };
}

const services = {
  '/auth': serviceTargets(process.env.AUTH_SERVICE_URL, 'http://localhost:3001'),
  '/owners': serviceTargets(process.env.OWNER_SERVICE_URL, 'http://localhost:3002'),
  '/customers': serviceTargets(process.env.CUSTOMER_SERVICE_URL, 'http://localhost:3003'),
  '/payments': serviceTargets(process.env.PAYMENT_SERVICE_URL, 'http://localhost:3004'),
  '/reviews': serviceTargets(process.env.REVIEW_SERVICE_URL, 'http://localhost:3005'),
  '/ratings': serviceTargets(process.env.REVIEW_SERVICE_URL, 'http://localhost:3005')
};

app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

for (const [path, targets] of Object.entries(services)) {
  const nextTarget = roundRobin(targets);

  app.use(path, createProxyMiddleware({
    target: targets[0],
    router: nextTarget,
    changeOrigin: true,
    pathRewrite: (_proxyPath, req) => req.originalUrl
  }));
}

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});
