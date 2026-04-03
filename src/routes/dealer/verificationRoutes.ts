import { Router } from 'express';
import { getVerificationRequirements, submitVerificationData } from '../../controllers/dealer/verificationController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';
import { upload } from '../../middlewares/uploadMiddleware';

const router = Router();
router.use(protect, authorize('DEALER'));

router.get('/requirements', getVerificationRequirements);
router.post('/submit', upload.single('file'), submitVerificationData);

export default router;