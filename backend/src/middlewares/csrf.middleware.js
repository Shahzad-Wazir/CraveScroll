const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false, // Readable by frontend JS for double-submit header
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function issueCsrfToken(req, res) {
  const token = req.cookies?.csrfToken || crypto.randomBytes(24).toString('hex');
  res.cookie('csrfToken', token, getCsrfCookieOptions());
  return token;
}

function csrfProtection(allowedOrigins = []) {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || process.env.NODE_ENV === 'test') {
      return next();
    }

    // 1. Validate Origin / Referer when present
    const origin = req.headers.origin;
    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: 'Forbidden: invalid request origin.' });
    }

    // 2. Enforce double-submit CSRF cookie + header when auth cookie is present
    if (req.cookies?.token) {
      const cookieToken = req.cookies?.csrfToken;
      const headerToken = req.headers['x-csrf-token'];
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ message: 'CSRF validation failed. Please refresh and try again.' });
      }
    }

    next();
  };
}

module.exports = { csrfProtection, issueCsrfToken, getCsrfCookieOptions };
