import { Router } from 'express';
import { createProduct, getProducts, getProductById } from '../controllers/productController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('admin'), upload.array('images', 5), createProduct);

export default router;