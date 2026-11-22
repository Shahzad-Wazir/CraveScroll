const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const foodModel = require('../models/food.model');
const likeModel = require('../models/likes.model');
const saveModel = require('../models/save.model');
const commentModel = require('../models/comment.model');
const followModel = require('../models/follow.model');
const storageService = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { runWithTransaction } = require('../utils/transaction');
const { isValidVideoBuffer } = require('../utils/fileSignature');

async function enrichFoodItems(items, userId) {
  if (!items.length) return [];

  const foodIds = items.map((item) => item._id);
  const partnerIds = [
    ...new Set(
      items
        .map((item) => item.foodPartner?._id || item.foodPartner)
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  let likedSet = new Set();
  let savedSet = new Set();
  let followedSet = new Set();

  if (userId) {
    const [likes, saves, follows] = await Promise.all([
      likeModel.find({ user: userId, food: { $in: foodIds } }).select('food').lean(),
      saveModel.find({ user: userId, food: { $in: foodIds } }).select('food').lean(),
      followModel.find({ user: userId, foodPartner: { $in: partnerIds } }).select('foodPartner').lean(),
    ]);
    likedSet = new Set(likes.map((l) => l.food.toString()));
    savedSet = new Set(saves.map((s) => s.food.toString()));
    followedSet = new Set(follows.map((f) => f.foodPartner.toString()));
  }

  return items.map((item) => {
    const obj = typeof item.toObject === 'function' ? item.toObject() : item;
    const partnerId = (obj.foodPartner?._id || obj.foodPartner || '').toString();
    return {
      ...obj,
      isLiked: likedSet.has(obj._id.toString()),
      isSaved: savedSet.has(obj._id.toString()),
      isFollowing: partnerId ? followedSet.has(partnerId) : false,
    };
  });
}

const createFood = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload a food video file.', 400);
  }

  // Validate actual magic-byte video signature to reject corrupted or spoofed files
  if (!isValidVideoBuffer(req.file.buffer)) {
    throw new AppError('Invalid or corrupted video file signature. Upload a genuine MP4, MOV, or WebM video.', 400);
  }

  const ext = req.file.originalname?.split('.').pop() || 'mp4';
  const fileName = `${uuid()}.${ext}`;
  const uploaded = await storageService.uploadFile(req.file.buffer, fileName, '/cravescroll/videos');

  let foodItem;
  try {
    foodItem = await foodModel.create({
      name: req.body.name,
      description: req.body.description || '',
      price: req.body.price ?? 0,
      category: req.body.category || 'Other',
      dietType: req.body.dietType || 'Veg',
      video: uploaded.url,
      videoFileId: uploaded.fileId,
      foodPartner: req.foodPartner._id,
    });
  } catch (dbErr) {
    // Clean up newly uploaded video if DB insert fails
    await storageService.deleteFileOrTrackOrphan(uploaded.fileId, 'video', 'DB insert failed during createFood');
    throw dbErr;
  }

  const populated = await foodModel
    .findById(foodItem._id)
    .populate('foodPartner', 'name address avatar phone whatsapp followersCount')
    .lean();

  res.status(201).json({
    message: 'Food reel created successfully',
    food: populated,
  });
});

const getFoodItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
  const skip = (page - 1) * limit;

  const { search, category, dietType, feed } = req.query;
  const query = {};
  let useTextScore = false;

  if (search && search.trim()) {
    const trimmed = search.trim();
    if (trimmed.length >= 3 && !trimmed.includes('"')) {
      query.$text = { $search: trimmed };
      useTextScore = true;
    } else {
      const safeRegex = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeRegex, $options: 'i' } },
        { description: { $regex: safeRegex, $options: 'i' } },
      ];
    }
  }

  if (category && category !== 'All') {
    query.category = category;
  }

  if (dietType && dietType !== 'All') {
    query.dietType = dietType;
  }

  if (feed === 'following') {
    if (!req.user) {
      return res.status(200).json({
        message: 'Log in as a user to see reels from partners you follow.',
        foodItems: [],
        pagination: { page, limit, total: 0, hasMore: false },
      });
    }
    const follows = await followModel.find({ user: req.user._id }).select('foodPartner').lean();
    const followedPartnerIds = follows.map((f) => f.foodPartner);
    if (!followedPartnerIds.length) {
      return res.status(200).json({
        message: 'You are not following any food partners yet.',
        foodItems: [],
        pagination: { page, limit, total: 0, hasMore: false },
      });
    }
    query.foodPartner = { $in: followedPartnerIds };
  }

  let findQuery = foodModel.find(query);
  if (useTextScore) {
    findQuery = findQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' }, createdAt: -1 });
  } else {
    findQuery = findQuery.sort({ createdAt: -1 });
  }

  let [rawItems, total] = await Promise.all([
    findQuery
      .skip(skip)
      .limit(limit)
      .populate('foodPartner', 'name address avatar phone whatsapp followersCount')
      .lean(),
    foodModel.countDocuments(query),
  ]);

  // Fallback to substring regex if text search returned 0 (handles partial words like "pan" -> "Paneer")
  if (useTextScore && rawItems.length === 0 && page === 1) {
    const safeRegex = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fallbackQuery = { ...query };
    delete fallbackQuery.$text;
    fallbackQuery.$or = [
      { name: { $regex: safeRegex, $options: 'i' } },
      { description: { $regex: safeRegex, $options: 'i' } },
      { category: { $regex: safeRegex, $options: 'i' } },
    ];
    [rawItems, total] = await Promise.all([
      foodModel
        .find(fallbackQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('foodPartner', 'name address avatar phone whatsapp followersCount')
        .lean(),
      foodModel.countDocuments(fallbackQuery),
    ]);
  }

  const foodItems = await enrichFoodItems(rawItems, req.user?._id);

  res.status(200).json({
    message: 'Food reels fetched successfully',
    foodItems,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + foodItems.length < total,
    },
  });
});

const getFoodById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid food reel ID.', 400);
  }

  const food = await foodModel
    .findById(id)
    .populate('foodPartner', 'name address avatar phone whatsapp followersCount')
    .lean();

  if (!food) {
    throw new AppError('Food reel not found.', 404);
  }

  const [enriched] = await enrichFoodItems([food], req.user?._id);
  res.status(200).json({ message: 'Food reel fetched successfully', food: enriched });
});

const updateFood = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid food reel ID.', 400);
  }

  const food = await foodModel.findById(id);
  if (!food) {
    throw new AppError('Food reel not found.', 404);
  }

  if (food.foodPartner.toString() !== req.foodPartner._id.toString()) {
    throw new AppError('You can only edit your own food reels.', 403);
  }

  const allowedFields = ['name', 'description', 'price', 'category', 'dietType', 'isAvailable'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      food[field] = req.body[field];
    }
  }

  await food.save();
  res.status(200).json({ message: 'Food reel updated successfully', food });
});

// Priority 2: DB-first deletion inside transaction, then separate media cleanup with orphan logging
const deleteFood = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid food reel ID.', 400);
  }

  const food = await foodModel.findById(id);
  if (!food) {
    throw new AppError('Food reel not found.', 404);
  }

  if (food.foodPartner.toString() !== req.foodPartner._id.toString()) {
    throw new AppError('You can only delete your own food reels.', 403);
  }

  const fileIdToDelete = food.videoFileId;

  // Step 1: Delete DB records safely first
  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    await foodModel.deleteOne({ _id: food._id }, opts);
    await likeModel.deleteMany({ food: food._id }, opts);
    await saveModel.deleteMany({ food: food._id }, opts);
    await commentModel.deleteMany({ food: food._id }, opts);
  });

  // Step 2: Delete cloud media separately; log to OrphanedMedia on failure
  if (fileIdToDelete) {
    await storageService.deleteFileOrTrackOrphan(
      fileIdToDelete,
      'video',
      `Orphaned after deleting food ${food._id}`
    );
  }

  res.status(200).json({ message: 'Food reel deleted successfully' });
});

// Priority 1: Explicit Idempotent PUT /api/food/:id/like
const addLike = asyncHandler(async (req, res) => {
  const foodId = req.params.id || req.body.foodId;
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    throw new AppError('Valid food ID is required.', 400);
  }

  const food = await foodModel.findById(foodId).select('likeCount').lean();
  if (!food) {
    throw new AppError('Food reel not found.', 404);
  }

  try {
    const likeCount = await runWithTransaction(async (session) => {
      const opts = session ? { session } : {};
      await likeModel.create([{ user: req.user._id, food: foodId }], opts);
      const updated = await foodModel.findByIdAndUpdate(
        foodId,
        { $inc: { likeCount: 1 } },
        { new: true, ...opts }
      );
      return updated?.likeCount ?? (food.likeCount + 1);
    });

    return res.status(200).json({
      message: 'Food liked successfully',
      liked: true,
      likeCount,
    });
  } catch (err) {
    // Idempotent handling: duplicate key (11000) means already liked -> return 200 without incrementing
    if (err.code === 11000) {
      const current = await foodModel.findById(foodId).select('likeCount').lean();
      return res.status(200).json({
        message: 'Food already liked',
        liked: true,
        likeCount: current?.likeCount ?? food.likeCount,
      });
    }
    throw err;
  }
});

// Priority 1: Explicit Idempotent DELETE /api/food/:id/like
const removeLike = asyncHandler(async (req, res) => {
  const foodId = req.params.id || req.body.foodId;
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    throw new AppError('Valid food ID is required.', 400);
  }

  const likeCount = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const deleted = await likeModel.findOneAndDelete({ user: req.user._id, food: foodId }, opts);
    if (!deleted) {
      const current = await foodModel.findById(foodId).select('likeCount').lean();
      return current?.likeCount ?? 0;
    }
    const updated = await foodModel.findOneAndUpdate(
      { _id: foodId, likeCount: { $gt: 0 } },
      { $inc: { likeCount: -1 } },
      { new: true, ...opts }
    );
    return updated?.likeCount ?? 0;
  });

  res.status(200).json({
    message: 'Food unliked successfully',
    liked: false,
    likeCount,
  });
});

// Priority 1: Explicit Idempotent PUT /api/food/:id/save
const addSave = asyncHandler(async (req, res) => {
  const foodId = req.params.id || req.body.foodId;
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    throw new AppError('Valid food ID is required.', 400);
  }

  const food = await foodModel.findById(foodId).select('savesCount').lean();
  if (!food) {
    throw new AppError('Food reel not found.', 404);
  }

  try {
    const savesCount = await runWithTransaction(async (session) => {
      const opts = session ? { session } : {};
      await saveModel.create([{ user: req.user._id, food: foodId }], opts);
      const updated = await foodModel.findByIdAndUpdate(
        foodId,
        { $inc: { savesCount: 1 } },
        { new: true, ...opts }
      );
      return updated?.savesCount ?? (food.savesCount + 1);
    });

    return res.status(200).json({
      message: 'Food saved successfully',
      saved: true,
      savesCount,
    });
  } catch (err) {
    if (err.code === 11000) {
      const current = await foodModel.findById(foodId).select('savesCount').lean();
      return res.status(200).json({
        message: 'Food already saved',
        saved: true,
        savesCount: current?.savesCount ?? food.savesCount,
      });
    }
    throw err;
  }
});

// Priority 1: Explicit Idempotent DELETE /api/food/:id/save
const removeSave = asyncHandler(async (req, res) => {
  const foodId = req.params.id || req.body.foodId;
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    throw new AppError('Valid food ID is required.', 400);
  }

  const savesCount = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const deleted = await saveModel.findOneAndDelete({ user: req.user._id, food: foodId }, opts);
    if (!deleted) {
      const current = await foodModel.findById(foodId).select('savesCount').lean();
      return current?.savesCount ?? 0;
    }
    const updated = await foodModel.findOneAndUpdate(
      { _id: foodId, savesCount: { $gt: 0 } },
      { $inc: { savesCount: -1 } },
      { new: true, ...opts }
    );
    return updated?.savesCount ?? 0;
  });

  res.status(200).json({
    message: 'Food unsaved successfully',
    saved: false,
    savesCount,
  });
});

const getSavedFoods = asyncHandler(async (req, res) => {
  const saves = await saveModel
    .find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'food',
      populate: {
        path: 'foodPartner',
        select: 'name address avatar phone whatsapp followersCount',
      },
    })
    .lean();

  const validFoods = saves.map((s) => s.food).filter(Boolean);
  const enrichedFoods = await enrichFoodItems(validFoods, req.user._id);

  res.status(200).json({
    message: 'Saved reels retrieved successfully',
    savedFoods: enrichedFoods,
  });
});

const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid food reel ID.', 400);
  }

  const comments = await commentModel
    .find({ food: id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.status(200).json({ message: 'Comments fetched successfully', comments });
});

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid food reel ID.', 400);
  }

  const foodExists = await foodModel.exists({ _id: id });
  if (!foodExists) {
    throw new AppError('Food reel not found.', 404);
  }

  const { role, account } = req.auth;
  const authorName = role === 'user' ? account.fullName : account.name;

  const { comment, commentsCount } = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [created] = await commentModel.create(
      [
        {
          food: id,
          authorId: account._id,
          authorRole: role,
          authorName,
          text: req.body.text,
        },
      ],
      opts
    );
    const updatedFood = await foodModel.findByIdAndUpdate(
      id,
      { $inc: { commentsCount: 1 } },
      { new: true, ...opts }
    );
    return { comment: created, commentsCount: updatedFood?.commentsCount ?? 1 };
  });

  res.status(201).json({
    message: 'Comment added successfully',
    comment,
    commentsCount,
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const comment = await commentModel.findOne({ _id: commentId, food: id });
  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  const food = await foodModel.findById(id).select('foodPartner').lean();
  const isAuthor = comment.authorId.toString() === req.auth.id.toString();
  const isReelOwner =
    req.auth.role === 'foodpartner' &&
    food &&
    food.foodPartner.toString() === req.auth.id.toString();

  if (!isAuthor && !isReelOwner) {
    throw new AppError('You do not have permission to delete this comment.', 403);
  }

  const commentsCount = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const deleted = await commentModel.findOneAndDelete({ _id: comment._id }, opts);
    if (!deleted) return 0;
    const updatedFood = await foodModel.findOneAndUpdate(
      { _id: id, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
      { new: true, ...opts }
    );
    return updatedFood?.commentsCount ?? 0;
  });

  res.status(200).json({ message: 'Comment deleted successfully', commentsCount });
});

module.exports = {
  createFood,
  getFoodItems,
  getFoodById,
  updateFood,
  deleteFood,
  addLike,
  removeLike,
  addSave,
  removeSave,
  getSavedFoods,
  getComments,
  addComment,
  deleteComment,
};
