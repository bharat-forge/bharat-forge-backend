import { Router } from 'express';
import { getAdminDashboardStats } from '../../controllers/admin/dashboardController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));


router.get('/stats', getAdminDashboardStats);

export default router;