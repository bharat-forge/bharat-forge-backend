import { Router } from 'express';
import { submitReview, updateMyReview, deleteMyReview } from '../../controllers/user/productReviewController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/', submitReview);
router.put('/:reviewId', updateMyReview);
router.delete('/:reviewId', deleteMyReview);

export default router;