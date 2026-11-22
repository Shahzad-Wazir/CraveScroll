const express = require('express');
const rateLimit = require('express-rate-limit');
const foodPartnerController = require('../controllers/food-partner.controller');
const {
  authFoodPartnerMiddleware,
  authUserMiddleware,
  optionalAuthMiddleware,
} = require('../middlewares/auth.middleware');
const { uploadImage } = require('../middlewares/upload.middleware');
const { validate, updatePartnerSchema } = require('../utils/validators');

const router = express.Router();

const avatarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many avatar updates. Please wait a few minutes.' },
});

router.get('/', optionalAuthMiddleware, foodPartnerController.listFoodPartners);

router.patch(
  '/me',
  authFoodPartnerMiddleware,
  validate(updatePartnerSchema),
  foodPartnerController.updateMyProfile
);
router.patch(
  '/me/avatar',
  avatarLimiter,
  authFoodPartnerMiddleware,
  uploadImage.single('avatar'),
  foodPartnerController.uploadMyAvatar
);

router.get('/:id', optionalAuthMiddleware, foodPartnerController.getFoodPartnerById);

// Explicit idempotent follow / unfollow endpoints
router.put('/:id/follow', authUserMiddleware, foodPartnerController.followPartner);
router.delete('/:id/follow', authUserMiddleware, foodPartnerController.unfollowPartner);

module.exports = router;
