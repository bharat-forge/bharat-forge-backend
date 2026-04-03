import { Router } from 'express';
import { getAllTickets, updateTicketStatus } from '../../controllers/admin/ticketManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.get('/', getAllTickets);
router.patch('/:ticketId/status', updateTicketStatus);

export default router;