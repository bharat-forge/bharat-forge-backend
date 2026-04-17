import { Router } from 'express';
import { getPaginatedContactRequests, updateContactRequestStatus, deleteContactRequest } from '../../controllers/admin/contactRequestManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/', getPaginatedContactRequests);
router.put('/:id/status', updateContactRequestStatus);
router.delete('/:id', deleteContactRequest);

export default router;