import { Router } from 'express';
import { getMyCart, addToCart, removeFromCart, clearMyCart, updateCartItemQuantity } from '../../controllers/shared/cartController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.get('/', getMyCart);
router.post('/add', addToCart);
router.put('/item/:itemId', updateCartItemQuantity);
router.delete('/item/:itemId', removeFromCart);
router.delete('/clear', clearMyCart);

export default router;