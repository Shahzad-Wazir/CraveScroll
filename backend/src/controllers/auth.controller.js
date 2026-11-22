const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const userModel = require('../models/user.model');
const foodPartnerModel = require('../models/foodpartner.model');
const deliveryPartnerModel = require('../models/deliveryPartner.model');
const revokedTokenModel = require('../models/revokedToken.model');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookie');
const { issueCsrfToken } = require('../middlewares/csrf.middleware');

function signToken(id, role) {
  return jwt.sign(
    { id, role, jti: uuid() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: 'user',
    createdAt: user.createdAt,
  };
}

function sanitizePartner(partner) {
  return {
    _id: partner._id,
    name: partner.name,
    contactName: partner.contactName,
    phone: partner.phone,
    whatsapp: partner.whatsapp || '',
    address: partner.address,
    bio: partner.bio || '',
    avatar: partner.avatar || '',
    email: partner.email,
    followersCount: partner.followersCount || 0,
    role: 'foodpartner',
    createdAt: partner.createdAt,
  };
}

const getCsrfToken = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  res.status(200).json({ csrfToken });
});

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const existing = await userModel.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
  });

  const token = signToken(user._id, 'user');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(201).json({
    message: 'User registered successfully',
    role: 'user',
    csrfToken,
    user: sanitizeUser(user),
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken(user._id, 'user');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(200).json({
    message: 'User logged in successfully',
    role: 'user',
    csrfToken,
    user: sanitizeUser(user),
  });
});

const registerFoodPartner = asyncHandler(async (req, res) => {
  const { name, email, password, phone, whatsapp, address, contactName, bio } = req.body;

  const existing = await foodPartnerModel.findOne({ email });
  if (existing) {
    throw new AppError('A food partner account with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const foodPartner = await foodPartnerModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
    whatsapp: whatsapp || phone,
    address,
    contactName,
    bio: bio || '',
  });

  const token = signToken(foodPartner._id, 'foodpartner');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(201).json({
    message: 'Food partner registered successfully',
    role: 'foodpartner',
    csrfToken,
    foodPartner: sanitizePartner(foodPartner),
  });
});

const loginFoodPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foodPartner = await foodPartnerModel.findOne({ email }).select('+password');
  if (!foodPartner) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, foodPartner.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken(foodPartner._id, 'foodpartner');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(200).json({
    message: 'Food partner logged in successfully',
    role: 'foodpartner',
    csrfToken,
    foodPartner: sanitizePartner(foodPartner),
  });
});


function sanitizeDeliveryPartner(rider) {
  return {
    _id: rider._id,
    fullName: rider.fullName,
    email: rider.email,
    phone: rider.phone,
    vehicleNumber: rider.vehicleNumber || '',
    isAvailable: rider.isAvailable !== false,
    role: 'deliverypartner',
    createdAt: rider.createdAt,
  };
}

const registerDeliveryPartner = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, vehicleNumber } = req.body;
  const existing = await deliveryPartnerModel.findOne({ email });
  if (existing) throw new AppError('A delivery partner account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const rider = await deliveryPartnerModel.create({
    fullName,
    email,
    password: hashedPassword,
    phone,
    vehicleNumber: vehicleNumber || '',
  });

  const token = signToken(rider._id, 'deliverypartner');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(201).json({
    message: 'Delivery partner registered successfully',
    role: 'deliverypartner',
    csrfToken,
    deliveryPartner: sanitizeDeliveryPartner(rider),
  });
});

const loginDeliveryPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const rider = await deliveryPartnerModel.findOne({ email }).select('+password');
  if (!rider) throw new AppError('Invalid email or password.', 401);

  const ok = await bcrypt.compare(password, rider.password);
  if (!ok) throw new AppError('Invalid email or password.', 401);

  const token = signToken(rider._id, 'deliverypartner');
  setAuthCookie(res, token);
  const csrfToken = issueCsrfToken(req, res);

  res.status(200).json({
    message: 'Delivery partner logged in successfully',
    role: 'deliverypartner',
    csrfToken,
    deliveryPartner: sanitizeDeliveryPartner(rider),
  });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.jti && decoded?.exp) {
        await revokedTokenModel.updateOne(
          { jti: decoded.jti },
          { $setOnInsert: { jti: decoded.jti, expiresAt: new Date(decoded.exp * 1000) } },
          { upsert: true }
        );
      }
    } catch {
      // Token already invalid/expired — still clear cookie
    }
  }

  clearAuthCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  const { role, account } = req.auth;
  if (role === 'user') {
    return res.status(200).json({
      role: 'user',
      csrfToken,
      account: sanitizeUser(account),
    });
  }
  if (role === 'deliverypartner') {
    return res.status(200).json({
      role: 'deliverypartner',
      csrfToken,
      account: sanitizeDeliveryPartner(account),
    });
  }
  return res.status(200).json({
    role: 'foodpartner',
    csrfToken,
    account: sanitizePartner(account),
  });
});

module.exports = {
  getCsrfToken,
  registerUser,
  loginUser,
  registerFoodPartner,
  loginFoodPartner,
  registerDeliveryPartner,
  loginDeliveryPartner,
  logout,
  getMe,
};
