const jwt = require('jsonwebtoken');
const foodPartnerModel = require('../models/foodpartner.model');
const userModel = require('../models/user.model');
const deliveryPartnerModel = require('../models/deliveryPartner.model');
const revokedTokenModel = require('../models/revokedToken.model');

async function resolveAccountFromToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded || !decoded.id || !decoded.role) return null;

  if (decoded.jti) {
    const revoked = await revokedTokenModel.exists({ jti: decoded.jti });
    if (revoked) return null;
  }

  if (decoded.role === 'user') {
    const user = await userModel.findById(decoded.id).select('-password');
    if (!user) return null;
    return { id: user._id, role: 'user', account: user, decoded };
  }

  if (decoded.role === 'foodpartner') {
    const partner = await foodPartnerModel.findById(decoded.id).select('-password');
    if (!partner) return null;
    return { id: partner._id, role: 'foodpartner', account: partner, decoded };
  }

  if (decoded.role === 'deliverypartner') {
    const rider = await deliveryPartnerModel.findById(decoded.id).select('-password');
    if (!rider) return null;
    return { id: rider._id, role: 'deliverypartner', account: rider, decoded };
  }

  return null;
}

function requireRole(expectedRole, errorMsg) {
  return async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Please log in first.' });
    try {
      const resolved = await resolveAccountFromToken(token);
      if (!resolved) return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
      if (resolved.role !== expectedRole) return res.status(403).json({ message: errorMsg });

      req.auth = resolved;
      if (expectedRole === 'user') req.user = resolved.account;
      if (expectedRole === 'foodpartner') req.foodPartner = resolved.account;
      if (expectedRole === 'deliverypartner') req.deliveryPartner = resolved.account;
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  };
}

const authUserMiddleware = requireRole('user', 'This action is only available for customer accounts.');
const authFoodPartnerMiddleware = requireRole('foodpartner', 'Access denied. Food partner account required.');
const authDeliveryPartnerMiddleware = requireRole('deliverypartner', 'Access denied. Delivery partner account required.');

async function authAnyMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    const resolved = await resolveAccountFromToken(token);
    if (!resolved) return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
    req.auth = resolved;
    if (resolved.role === 'user') req.user = resolved.account;
    if (resolved.role === 'foodpartner') req.foodPartner = resolved.account;
    if (resolved.role === 'deliverypartner') req.deliveryPartner = resolved.account;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

async function optionalAuthMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const resolved = await resolveAccountFromToken(token);
    if (resolved) {
      req.auth = resolved;
      if (resolved.role === 'user') req.user = resolved.account;
      if (resolved.role === 'foodpartner') req.foodPartner = resolved.account;
      if (resolved.role === 'deliverypartner') req.deliveryPartner = resolved.account;
    }
  } catch {
    // Public browsing continues
  }
  next();
}

module.exports = {
  authUserMiddleware,
  authFoodPartnerMiddleware,
  authDeliveryPartnerMiddleware,
  authAnyMiddleware,
  optionalAuthMiddleware,
};
