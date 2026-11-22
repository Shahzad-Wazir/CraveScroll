const isProduction = () => process.env.NODE_ENV === 'production';

function getCookieOptions() {
  const prod = isProduction();
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie('token', token, getCookieOptions());
}

function clearAuthCookie(res) {
  const prod = isProduction();
  res.clearCookie('token', {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    path: '/',
  });
}

module.exports = { setAuthCookie, clearAuthCookie, getCookieOptions };
