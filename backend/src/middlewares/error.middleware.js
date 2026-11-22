const multer = require('multer');

function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || undefined;

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file is too large. Max 30MB for videos and 5MB for avatars.';
    } else {
      message = `Upload error: ${err.message}`;
    }
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier provided for ${err.path || 'resource'}.`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    message = `An entry with this ${field} already exists.`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired authentication token.';
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Server Error]', err);
  }

  res.status(statusCode).json({
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorMiddleware;
