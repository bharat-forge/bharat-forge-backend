import { Router } from 'express';
import { checkoutCart, getMyOrders } from '../../controllers/shared/checkoutController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/process', checkoutCart);
router.get('/my-orders', getMyOrders);

export default router;