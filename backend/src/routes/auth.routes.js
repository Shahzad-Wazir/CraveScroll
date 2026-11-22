const express = require('express');
const authController = require('../controllers/auth.controller');
const { authAnyMiddleware } = require('../middlewares/auth.middleware');
const {
  validate,
  registerUserSchema,
  loginSchema,
  registerPartnerSchema,
  registerDeliveryPartnerSchema,
} = require('../utils/validators');

const router = express.Router();

router.get('/csrf-token', authController.getCsrfToken);

// User auth
router.post('/user/register', validate(registerUserSchema), authController.registerUser);
router.post('/user/login', validate(loginSchema), authController.loginUser);
router.post('/user/logout', authController.logout);

// Food partner auth
router.post('/food-partner/register', validate(registerPartnerSchema), authController.registerFoodPartner);
router.post('/food-partner/login', validate(loginSchema), authController.loginFoodPartner);
router.post('/food-partner/logout', authController.logout);

// Delivery partner auth
router.post('/delivery-partner/register', validate(registerDeliveryPartnerSchema), authController.registerDeliveryPartner);
router.post('/delivery-partner/login', validate(loginSchema), authController.loginDeliveryPartner);
router.post('/delivery-partner/logout', authController.logout);

// Unified session endpoints
router.post('/logout', authController.logout);
router.get('/me', authAnyMiddleware, authController.getMe);

module.exports = router;
