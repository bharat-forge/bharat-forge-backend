import { Router } from 'express';
import { getAllOrders, updateOrderStatus, updateRefundStatus } from '../../controllers/admin/orderManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.get('/', getAllOrders);
router.patch('/:orderId/status', updateOrderStatus);
router.patch('/:orderId/refund', updateRefundStatus);

export default router;