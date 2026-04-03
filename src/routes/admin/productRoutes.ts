import { Router } from 'express';
import { 
  createProduct,
  getPaginatedProducts,
  getProductById,
  updateProductBaseDetails,
  updateProductCompatibilities,
  updateProductStatus,
  hardDeleteProduct,
  getProductReviews,
  toggleProductReviewStatus
} from '../../controllers/admin/productController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';
import { upload } from '../../middlewares/uploadMiddleware'; 

const router = Router();

router.use(protect, authorize('ADMIN'));

router.post('/', upload.array('images', 5), createProduct);
router.get('/', getPaginatedProducts);
router.get('/:id', getProductById);
router.patch('/:id/details', updateProductBaseDetails);
router.put('/:id/compatibilities', updateProductCompatibilities);
router.patch('/:id/status', updateProductStatus);
router.delete('/:id/hard-delete', hardDeleteProduct);
router.get('/:id/reviews', getProductReviews);
router.patch('/reviews/:reviewId/status', toggleProductReviewStatus);

export default router;