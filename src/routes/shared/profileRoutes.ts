import { Router } from 'express';
import { updateMyProfile, getMyProfile } from '../../controllers/shared/profileController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.get('/', getMyProfile);
router.patch('/', updateMyProfile);

export default router;