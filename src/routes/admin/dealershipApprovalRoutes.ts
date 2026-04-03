import { Router } from 'express';
import { getAllDealershipRequests, updateDealershipStatus } from '../../controllers/admin/dealershipApprovalController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.get('/requests', getAllDealershipRequests);
router.patch('/requests/:dealerId/:productId', updateDealershipStatus);

export default router;