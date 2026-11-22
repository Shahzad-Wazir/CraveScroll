const express = require('express');
const rateLimit = require('express-rate-limit');
const foodController = require('../controllers/food.controller');
const {
  authFoodPartnerMiddleware,
  authUserMiddleware,
  authAnyMiddleware,
  optionalAuthMiddleware,
} = require('../middlewares/auth.middleware');
const { uploadVideo } = require('../middlewares/upload.middleware');
const {
  validate,
  createFoodSchema,
  updateFoodSchema,
  commentSchema,
} = require('../utils/validators');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload rate limit reached. Please wait a few minutes before uploading again.' },
});

router.post(
  '/',
  uploadLimiter,
  authFoodPartnerMiddleware,
  uploadVideo.single('video'),
  validate(createFoodSchema),
  foodController.createFood
);

router.get('/', optionalAuthMiddleware, foodController.getFoodItems);

// Saved list (placed before /:id)
router.get('/saved', authUserMiddleware, foodController.getSavedFoods);
router.get('/save', authUserMiddleware, foodController.getSavedFoods);

// Explicit idempotent like & save endpoints
router.put('/:id/like', authUserMiddleware, foodController.addLike);
router.delete('/:id/like', authUserMiddleware, foodController.removeLike);
router.put('/:id/save', authUserMiddleware, foodController.addSave);
router.delete('/:id/save', authUserMiddleware, foodController.removeSave);

// Single shareable reel, update & delete
router.get('/:id', optionalAuthMiddleware, foodController.getFoodById);
router.patch('/:id', authFoodPartnerMiddleware, validate(updateFoodSchema), foodController.updateFood);
router.delete('/:id', authFoodPartnerMiddleware, foodController.deleteFood);

// Comments CRUD
router.get('/:id/comments', optionalAuthMiddleware, foodController.getComments);
router.post('/:id/comments', authAnyMiddleware, validate(commentSchema), foodController.addComment);
router.delete('/:id/comments/:commentId', authAnyMiddleware, foodController.deleteComment);

module.exports = router;
