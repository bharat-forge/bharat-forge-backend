import { Router } from 'express';
import { getPaginatedPolicies, createPolicy, updatePolicy, activatePolicy, deletePolicy } from '../../controllers/admin/privacyManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.get('/', getPaginatedPolicies);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.put('/:id/activate', activatePolicy);
router.delete('/:id', deletePolicy);

export default router;