const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, default: '', trim: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('deliverypartner', deliveryPartnerSchema);
