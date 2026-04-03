import { Router } from 'express';
import { addComment, updateComment, deleteMyComment, castVote } from '../../controllers/user/articleInteractionController';
import { protect } from '../../middlewares/authMiddleware';

const router = Router();
router.use(protect);

router.post('/comments', addComment);
router.put('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteMyComment);
router.post('/votes', castVote);

export default router;