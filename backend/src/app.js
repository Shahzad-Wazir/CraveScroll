const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth.routes');
const foodRoutes = require('./routes/food.routes');
const foodPartnerRoutes = require('./routes/food-partner.routes');
const orderRoutes = require('./routes/order.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { csrfProtection } = require('./middlewares/csrf.middleware');
const AppError = require('./utils/AppError');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
]
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new AppError(`CORS blocked for origin: ${origin}`, 403));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Serve bundled demo food reel videos with range streaming support
app.use('/demo-videos', express.static(path.join(__dirname, '../public/demo-videos')));

// Double-submit CSRF + Origin validation on state-changing API calls
app.use('/api', csrfProtection(allowedOrigins));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down and try again shortly.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login/register attempts. Please try again in 15 minutes.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/', (req, res) => {
  res.json({ name: 'CraveScroll API', version: '2.0.0', status: 'running', health: '/health' });
});

app.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    status: 'ok',
    service: 'CraveScroll API',
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/food-partner', foodPartnerRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorMiddleware);

module.exports = app;
