import { Router } from 'express';
import { createOrder, verifyPayment, getUserOrders } from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';

const router = Router();

router.post('/', protect, authorize('user', 'dealer'), createOrder);
router.post('/verify-payment', protect, authorize('user', 'dealer'), verifyPayment);
router.get('/my-orders', protect, authorize('user', 'dealer'), getUserOrders);

export default router;