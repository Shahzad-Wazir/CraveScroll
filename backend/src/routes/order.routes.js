const express = require('express');
const orderController = require('../controllers/order.controller');
const {
  authUserMiddleware,
  authFoodPartnerMiddleware,
  authDeliveryPartnerMiddleware,
  authAnyMiddleware,
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', authUserMiddleware, orderController.createOrder);
router.get('/my', authUserMiddleware, orderController.getMyOrders);
router.get('/partner', authFoodPartnerMiddleware, orderController.getPartnerOrders);
router.get('/delivery', authDeliveryPartnerMiddleware, orderController.getDeliveryOrders);
router.get('/:id', authAnyMiddleware, orderController.getOrderById);
router.patch('/:id/status', authAnyMiddleware, orderController.updateOrderStatus);

module.exports = router;
