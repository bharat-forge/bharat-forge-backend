import { Router } from 'express';
import { 
  getPaginatedUsers, 
  getUserDetails, 
  updateUserStatus, 
  sendCustomNotification, 
  sendBulkNotification, 
  hardDeleteUser 
} from '../../controllers/admin/userManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/', getPaginatedUsers);
router.post('/bulk-notify', sendBulkNotification);
router.get('/:id', getUserDetails);
router.patch('/:id/status', updateUserStatus);
router.post('/:id/notify', sendCustomNotification);
router.delete('/:id', hardDeleteUser);

export default router;