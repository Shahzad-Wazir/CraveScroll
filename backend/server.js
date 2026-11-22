require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required.');
    process.exit(1);
  }

  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`CraveScroll API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing server gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    server.close(() => process.exit(1));
  });
}

startServer();
