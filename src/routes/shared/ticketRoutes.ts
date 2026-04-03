import { Router } from 'express';
import { createTicket, getMyTickets, getTicketDetails, postTicketMessage, resolveMyTicket, requestCallback } from '../../controllers/shared/ticketController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/', createTicket);
router.get('/', getMyTickets);
router.get('/:ticketId', getTicketDetails);
router.post('/:ticketId/messages', postTicketMessage);
router.patch('/:ticketId/resolve', resolveMyTicket);
router.patch('/:ticketId/callback', requestCallback);

export default router;