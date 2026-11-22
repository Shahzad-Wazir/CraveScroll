const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const foodPartnerModel = require('../models/foodpartner.model');
const foodModel = require('../models/food.model');
const followModel = require('../models/follow.model');
const storageService = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { runWithTransaction } = require('../utils/transaction');
const { isValidImageBuffer } = require('../utils/fileSignature');

// Priority 5: Paginated partner profile GET /api/food-partner/:id?page=1&limit=12
const getFoodPartnerById = asyncHandler(async (req, res) => {
  const foodPartnerId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(foodPartnerId)) {
    throw new AppError('Invalid food partner ID.', 400);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const skip = (page - 1) * limit;
  const partnerObjectId = new mongoose.Types.ObjectId(foodPartnerId);

  const [foodPartner, foodItems, statsAgg] = await Promise.all([
    foodPartnerModel.findById(foodPartnerId).select('-password').lean(),
    foodModel
      .find({ foodPartner: foodPartnerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    foodModel.aggregate([
      { $match: { foodPartner: partnerObjectId } },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: 1 },
          totalLikes: { $sum: '$likeCount' },
          totalSaves: { $sum: '$savesCount' },
        },
      },
    ]),
  ]);

  if (!foodPartner) {
    throw new AppError('Food partner not found.', 404);
  }

  const stats = statsAgg[0] || { totalMeals: 0, totalLikes: 0, totalSaves: 0 };

  let isFollowing = false;
  if (req.user) {
    const existingFollow = await followModel.exists({
      user: req.user._id,
      foodPartner: foodPartnerId,
    });
    isFollowing = Boolean(existingFollow);
  }

  res.status(200).json({
    message: 'Food partner retrieved successfully',
    foodPartner: {
      ...foodPartner,
      totalMeals: stats.totalMeals,
      totalLikes: stats.totalLikes,
      totalSaves: stats.totalSaves,
      isFollowing,
      foodItems,
    },
    pagination: {
      page,
      limit,
      total: stats.totalMeals,
      hasMore: skip + foodItems.length < stats.totalMeals,
    },
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'contactName', 'phone', 'whatsapp', 'address', 'bio', 'isOpen'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const updated = await foodPartnerModel
    .findByIdAndUpdate(req.foodPartner._id, updates, { new: true, runValidators: true })
    .select('-password');

  res.status(200).json({
    message: 'Partner profile updated successfully',
    foodPartner: updated,
  });
});

// Priority 2: Safe avatar workflow -> 1. Validate magic bytes, 2. Upload new, 3. Update DB, 4. Delete old separately
const uploadMyAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please select an image file for your avatar.', 400);
  }

  if (!isValidImageBuffer(req.file.buffer)) {
    throw new AppError('Invalid image signature. Upload a genuine JPG, PNG, or WebP image.', 400);
  }

  const partner = await foodPartnerModel.findById(req.foodPartner._id);
  const oldAvatarFileId = partner.avatarFileId;

  // Step 1: Upload new avatar first
  const ext = req.file.originalname?.split('.').pop() || 'jpg';
  const uploaded = await storageService.uploadFile(
    req.file.buffer,
    `avatar-${uuid()}.${ext}`,
    '/cravescroll/avatars'
  );

  // Step 2: Update DB; if DB update fails, delete the newly uploaded avatar
  try {
    partner.avatar = uploaded.url;
    partner.avatarFileId = uploaded.fileId;
    await partner.save();
  } catch (dbErr) {
    await storageService.deleteFileOrTrackOrphan(uploaded.fileId, 'avatar', 'DB update failed during avatar upload');
    throw dbErr;
  }

  // Step 3: Delete old avatar separately (never breaking the already-succeeded update)
  if (oldAvatarFileId && oldAvatarFileId !== uploaded.fileId) {
    await storageService.deleteFileOrTrackOrphan(oldAvatarFileId, 'avatar', 'Replaced by newer store avatar');
  }

  res.status(200).json({
    message: 'Store avatar updated successfully',
    avatar: partner.avatar,
  });
});

// Priority 1: Explicit Idempotent PUT /api/food-partner/:id/follow
const followPartner = asyncHandler(async (req, res) => {
  const partnerId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(partnerId)) {
    throw new AppError('Invalid food partner ID.', 400);
  }

  const partner = await foodPartnerModel.findById(partnerId).select('followersCount').lean();
  if (!partner) {
    throw new AppError('Food partner not found.', 404);
  }

  try {
    const followersCount = await runWithTransaction(async (session) => {
      const opts = session ? { session } : {};
      await followModel.create([{ user: req.user._id, foodPartner: partnerId }], opts);
      const updated = await foodPartnerModel.findByIdAndUpdate(
        partnerId,
        { $inc: { followersCount: 1 } },
        { new: true, ...opts }
      );
      return updated?.followersCount ?? (partner.followersCount + 1);
    });

    return res.status(200).json({
      message: 'Following food partner',
      following: true,
      followersCount,
    });
  } catch (err) {
    if (err.code === 11000) {
      const current = await foodPartnerModel.findById(partnerId).select('followersCount').lean();
      return res.status(200).json({
        message: 'Already following food partner',
        following: true,
        followersCount: current?.followersCount ?? partner.followersCount,
      });
    }
    throw err;
  }
});

// Priority 1: Explicit Idempotent DELETE /api/food-partner/:id/follow
const unfollowPartner = asyncHandler(async (req, res) => {
  const partnerId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(partnerId)) {
    throw new AppError('Invalid food partner ID.', 400);
  }

  const followersCount = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const deleted = await followModel.findOneAndDelete({ user: req.user._id, foodPartner: partnerId }, opts);
    if (!deleted) {
      const current = await foodPartnerModel.findById(partnerId).select('followersCount').lean();
      return current?.followersCount ?? 0;
    }
    const updated = await foodPartnerModel.findOneAndUpdate(
      { _id: partnerId, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
      { new: true, ...opts }
    );
    return updated?.followersCount ?? 0;
  });

  res.status(200).json({
    message: 'Unfollowed food partner',
    following: false,
    followersCount,
  });
});


const listFoodPartners = asyncHandler(async (req, res) => {
  const { search, cuisine, sort = 'rating' } = req.query;
  const query = {};

  if (search && search.trim()) {
    const safeRegex = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: safeRegex, $options: 'i' } },
      { address: { $regex: safeRegex, $options: 'i' } },
      { cuisines: { $regex: safeRegex, $options: 'i' } },
    ];
  }

  if (cuisine && cuisine !== 'All') {
    query.cuisines = { $regex: cuisine, $options: 'i' };
  }

  let sortObj = { rating: -1, reviewCount: -1 };
  if (sort === 'distance') sortObj = { distanceKm: 1 };
  if (sort === 'popular') sortObj = { followersCount: -1, rating: -1 };

  const partners = await foodPartnerModel
    .find(query)
    .select('-password')
    .sort(sortObj)
    .limit(30)
    .lean();

  res.status(200).json({
    message: 'Restaurants fetched successfully',
    restaurants: partners,
  });
});

module.exports = {
  listFoodPartners,
  getFoodPartnerById,
  updateMyProfile,
  uploadMyAvatar,
  followPartner,
  unfollowPartner,
};
