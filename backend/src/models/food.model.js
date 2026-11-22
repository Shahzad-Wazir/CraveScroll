const mongoose = require('mongoose');
const { FOOD_CATEGORIES, DIET_TYPES } = require('../utils/validators');

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    video: { type: String, required: true },
    videoFileId: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    description: { type: String, default: '', trim: true },
    price: { type: Number, default: 0, min: 0 },
    category: { type: String, enum: FOOD_CATEGORIES, default: 'Other', index: true },
    dietType: { type: String, enum: DIET_TYPES, default: 'Veg', index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    rating: { type: Number, default: 4.6, min: 0, max: 5 },
    foodPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'foodpartner',
      required: true,
      index: true,
    },
    likeCount: { type: Number, default: 0, min: 0 },
    savesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

foodSchema.index({ name: 'text', description: 'text' });
foodSchema.index({ createdAt: -1 });
foodSchema.index({ category: 1, dietType: 1, createdAt: -1 });

module.exports = mongoose.model('food', foodSchema);
