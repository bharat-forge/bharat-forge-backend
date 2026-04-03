import { Router } from 'express';
import { submitDealerReview, updateMyDealerReview, deleteMyDealerReview } from '../../controllers/user/dealerReviewController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/', submitDealerReview);
router.put('/:reviewId', updateMyDealerReview);
router.delete('/:reviewId', deleteMyDealerReview);

export default router;