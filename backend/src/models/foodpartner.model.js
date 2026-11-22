const mongoose = require('mongoose');

const foodPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, default: '', trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, default: 'Patna, Bihar', trim: true },
    bio: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    avatarFileId: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    cuisines: { type: [String], default: ['Indian', 'Street Food'] },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 120, min: 0 },
    deliveryTime: { type: String, default: '25–35 mins' },
    distanceKm: { type: Number, default: 2.1, min: 0 },
    isOpen: { type: Boolean, default: true },
    closingTime: { type: String, default: '11:00 PM' },
    isVerified: { type: Boolean, default: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    followersCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

foodPartnerSchema.index({ name: 'text', address: 'text', cuisines: 'text' });

module.exports = mongoose.model('foodpartner', foodPartnerSchema);
