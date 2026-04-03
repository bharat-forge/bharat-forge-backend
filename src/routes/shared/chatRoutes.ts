import { Router } from 'express';
import { sendMessage, getChatHistory, getMyConversations, updateMessageStatus, initializeChat } from '../../controllers/shared/chatController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/initialize', initializeChat);
router.post('/send', sendMessage);
router.get('/conversations', getMyConversations);
router.get('/history/:targetUserId', getChatHistory);
router.patch('/status/:messageId', updateMessageStatus);

export default router;