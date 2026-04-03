import { Router } from 'express';
import { getDetailedOrders, getOrderById, cancelOrder } from '../../controllers/shared/orderController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.get('/', getDetailedOrders);
router.get('/:orderId', getOrderById);
router.patch('/:orderId/cancel', cancelOrder);

export default router;