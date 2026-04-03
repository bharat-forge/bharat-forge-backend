import { Router } from 'express';
import { 
  getPaginatedNotifications, 
  getNotificationById, 
  markAsSeen, 
  markAllAsSeen, 
  archiveNotification, 
  deleteNotification 
} from '../../controllers/shared/notificationController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.patch('/seen-all', markAllAsSeen);

router.get('/', getPaginatedNotifications);

router.get('/:id', getNotificationById);
router.patch('/:id/seen', markAsSeen);
router.patch('/:id/archive', archiveNotification);
router.delete('/:id', deleteNotification);

export default router;