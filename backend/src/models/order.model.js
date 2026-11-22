const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');

const ORDER_STATUSES = [
  'Order Placed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const orderItemSchema = new mongoose.Schema(
  {
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'food', required: true },
    name: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    dietType: { type: String, default: 'Veg' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedByRole: { type: String, enum: ['user', 'foodpartner', 'deliverypartner', 'system'], default: 'system' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderUuid: { type: String, default: () => uuid(), unique: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    foodPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'foodpartner', required: true, index: true },
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'deliverypartner', default: null, index: true },
    items: { type: [orderItemSchema], required: true },
    itemTotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 39, min: 0 },
    taxes: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    deliveryAddress: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'Cash on Delivery'],
      default: 'UPI',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Order Placed',
      index: true,
    },
    estimatedMinutes: { type: Number, default: 30 },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ foodPartner: 1, createdAt: -1 });
orderSchema.index({ deliveryPartner: 1, status: 1, createdAt: -1 });

module.exports = {
  orderModel: mongoose.model('order', orderSchema),
  ORDER_STATUSES,
};
