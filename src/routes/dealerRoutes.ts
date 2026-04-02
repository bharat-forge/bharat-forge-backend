import { Router } from 'express';
import { createOrUpdateProfile, getProfile, getAllDealers, updateDealerStatus } from '../controllers/dealerController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/profile', protect, authorize('dealer'), getProfile);
router.post('/profile', protect, authorize('dealer'), createOrUpdateProfile);
router.get('/', protect, authorize('admin'), getAllDealers);
router.put('/:id/status', protect, authorize('admin'), updateDealerStatus);

export default router;