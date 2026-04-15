import { Router } from 'express';
import { getDealerDashboardStats } from '../../controllers/dealer/dashboardController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('DEALER'));

router.get('/stats', getDealerDashboardStats);

export default router;