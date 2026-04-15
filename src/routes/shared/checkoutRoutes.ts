import { Router } from 'express';
import { checkoutCart, getMyOrders, verifyRazorpayPayment } from '../../controllers/shared/checkoutController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/process', checkoutCart);
router.post('/verify', verifyRazorpayPayment);
router.get('/my-orders', getMyOrders);

export default router;