const crypto = require('crypto');
const mongoose = require('mongoose');
const { orderModel, ORDER_STATUSES } = require('../models/order.model');
const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const ETA_BY_STATUS = {
  'Order Placed': 30,
  Preparing: 22,
  'Out for Delivery': 12,
  Delivered: 0,
  Cancelled: 0,
};

// Strict production state machine: no skipping steps!
const VALID_TRANSITIONS = {
  'Order Placed': ['Preparing', 'Cancelled'],
  Preparing: ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

// Strict role permissions per target status
const ROLE_ALLOWED_STATUSES = {
  user: ['Cancelled'],                        // Customer can ONLY cancel while 'Order Placed'
  foodpartner: ['Preparing', 'Out for Delivery', 'Cancelled'], // Restaurant manages prep & dispatch
  deliverypartner: ['Out for Delivery', 'Delivered'],          // Delivery partner picks up & completes delivery
};

function generateOrderNumber() {
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CS-${timePart}-${randPart}`;
}

const createOrder = asyncHandler(async (req, res) => {
  const { foodPartnerId, items, deliveryAddress, paymentMethod = 'UPI' } = req.body;

  if (!foodPartnerId || !mongoose.Types.ObjectId.isValid(foodPartnerId)) {
    throw new AppError('Valid restaurant (foodPartnerId) is required.', 400);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }
  if (!deliveryAddress || deliveryAddress.trim().length < 5) {
    throw new AppError('Please enter a valid delivery address.', 400);
  }

  const partner = await foodPartnerModel.findById(foodPartnerId).select('name isOpen').lean();
  if (!partner) {
    throw new AppError('Restaurant not found.', 404);
  }

  // Enforce restaurant availability
  if (!partner.isOpen) {
    throw new AppError(`${partner.name} is currently closed and not accepting orders.`, 400);
  }

  const foodIds = items.map((i) => i.foodId);
  const dbFoods = await foodModel
    .find({ _id: { $in: foodIds }, foodPartner: foodPartnerId })
    .lean();

  const foodMap = new Map(dbFoods.map((f) => [f._id.toString(), f]));
  const orderItems = [];
  let itemTotal = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1));
    const dbFood = foodMap.get(String(item.foodId));
    if (!dbFood) {
      throw new AppError('One or more items in your cart are unavailable from this restaurant.', 400);
    }
    if (dbFood.isAvailable === false) {
      throw new AppError(`${dbFood.name} is currently out of stock.`, 400);
    }
    const linePrice = Number(dbFood.price) || 0;
    itemTotal += linePrice * qty;
    orderItems.push({
      food: dbFood._id,
      name: dbFood.name,
      thumbnail: dbFood.thumbnail || '',
      price: linePrice,
      quantity: qty,
      dietType: dbFood.dietType || 'Veg',
    });
  }

  const deliveryFee = itemTotal >= 499 ? 0 : 39;
  const taxes = Math.round(itemTotal * 0.05);
  const totalAmount = itemTotal + deliveryFee + taxes;

  // Collision-safe order number creation with automatic retry on 11000
  let order = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      order = await orderModel.create({
        orderNumber: generateOrderNumber(),
        user: req.user._id,
        foodPartner: foodPartnerId,
        items: orderItems,
        itemTotal,
        deliveryFee,
        taxes,
        totalAmount,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        status: 'Order Placed',
        estimatedMinutes: ETA_BY_STATUS['Order Placed'],
        statusHistory: [
          {
            status: 'Order Placed',
            note: `Order received by ${partner.name}`,
            updatedByRole: 'user',
          },
        ],
      });
      break;
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.orderNumber && attempt < 4) {
        continue;
      }
      throw err;
    }
  }

  const populated = await orderModel
    .findById(order._id)
    .populate('foodPartner', 'name avatar address phone rating distanceKm deliveryTime')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  res.status(201).json({ message: 'Order placed successfully!', order: populated });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { filter = 'all' } = req.query;
  const query = { user: req.user._id };

  if (filter === 'ongoing') {
    query.status = { $in: ['Order Placed', 'Preparing', 'Out for Delivery'] };
  } else if (filter === 'past') {
    query.status = 'Delivered';
  } else if (filter === 'cancelled') {
    query.status = 'Cancelled';
  }

  const orders = await orderModel
    .find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('foodPartner', 'name avatar address phone rating distanceKm deliveryTime')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  res.status(200).json({ message: 'Orders fetched successfully', orders });
});

const getPartnerOrders = asyncHandler(async (req, res) => {
  const orders = await orderModel
    .find({ foodPartner: req.foodPartner._id })
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('user', 'fullName email')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  res.status(200).json({ message: 'Partner orders fetched successfully', orders });
});

// Delivery Partner queue: Preparing (ready for pickup), Out for Delivery, or Delivered by this rider
const getDeliveryOrders = asyncHandler(async (req, res) => {
  const riderId = req.deliveryPartner._id;
  const orders = await orderModel
    .find({
      $or: [
        { status: 'Out for Delivery', deliveryPartner: { $in: [null, riderId] } },
        { status: 'Preparing', deliveryPartner: null },
        { deliveryPartner: riderId },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('foodPartner', 'name avatar address phone')
    .populate('user', 'fullName email')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  res.status(200).json({ message: 'Delivery queue fetched successfully', orders });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid order ID.', 400);
  }

  const order = await orderModel
    .findById(id)
    .populate('foodPartner', 'name avatar address phone rating distanceKm deliveryTime')
    .populate('user', 'fullName email')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  if (!order) throw new AppError('Order not found.', 404);

  const isOwnerUser = req.auth.role === 'user' && order.user?._id?.toString() === req.auth.id.toString();
  const isOwnerPartner = req.auth.role === 'foodpartner' && order.foodPartner?._id?.toString() === req.auth.id.toString();
  const isRider = req.auth.role === 'deliverypartner';

  if (!isOwnerUser && !isOwnerPartner && !isRider) {
    throw new AppError('You do not have permission to view this order.', 403);
  }

  res.status(200).json({ order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    throw new AppError(`Invalid order status. Allowed: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const order = await orderModel.findById(id);
  if (!order) throw new AppError('Order not found.', 404);

  const role = req.auth.role;
  const isUserOwner = role === 'user' && order.user.toString() === req.auth.id.toString();
  const isPartnerOwner = role === 'foodpartner' && order.foodPartner.toString() === req.auth.id.toString();
  const isDeliveryPartner = role === 'deliverypartner';

  if (!isUserOwner && !isPartnerOwner && !isDeliveryPartner) {
    throw new AppError('You are not authorized to update this order.', 403);
  }

  // 1. Enforce role-specific status permissions
  const allowedForRole = ROLE_ALLOWED_STATUSES[role] || [];
  if (!allowedForRole.includes(status)) {
    throw new AppError(
      `Role '${role}' is not permitted to change order status to '${status}'.`,
      403
    );
  }

  // 2. Enforce strict sequential state machine (no skipping steps)
  const validNext = VALID_TRANSITIONS[order.status] || [];
  if (!validNext.includes(status)) {
    throw new AppError(
      `Invalid transition: cannot move order directly from '${order.status}' to '${status}'.`,
      400
    );
  }

  // 3. Controlled cancellation rules
  if (status === 'Cancelled' && role === 'user' && order.status !== 'Order Placed') {
    throw new AppError('Customers can only cancel an order before the restaurant starts preparing it.', 400);
  }

  // 4. Delivery partner assignment & ownership check
  if (role === 'deliverypartner') {
    if (order.deliveryPartner && order.deliveryPartner.toString() !== req.auth.id.toString()) {
      throw new AppError('This order is already assigned to another delivery partner.', 403);
    }
    if (!order.deliveryPartner) {
      order.deliveryPartner = req.auth.id;
    }
  }

  order.status = status;
  order.estimatedMinutes = ETA_BY_STATUS[status] ?? 0;
  order.statusHistory.push({
    status,
    note: note || `Marked as ${status} by ${role}`,
    updatedByRole: role,
  });

  await order.save();

  const populated = await orderModel
    .findById(order._id)
    .populate('foodPartner', 'name avatar address phone rating distanceKm deliveryTime')
    .populate('user', 'fullName email')
    .populate('deliveryPartner', 'fullName phone vehicleNumber')
    .lean();

  res.status(200).json({ message: `Order updated to ${status}`, order: populated });
});

module.exports = {
  createOrder,
  getMyOrders,
  getPartnerOrders,
  getDeliveryOrders,
  getOrderById,
  updateOrderStatus,
};
