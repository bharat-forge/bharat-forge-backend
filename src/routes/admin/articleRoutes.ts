import { Router } from 'express';
import { 
  createArticle, 
  updateArticle, 
  updateArticleStatus,
  getPaginatedArticles, 
  getArticleComments,
  toggleCommentStatus, 
  deleteComment 
} from '../../controllers/admin/articleController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';
import { upload } from '../../middlewares/uploadMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.post('/', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'supportingImages', maxCount: 3 }]), createArticle);
router.patch('/:id', updateArticle);
router.patch('/:id/status', updateArticleStatus);
router.get('/:id/comments', getArticleComments);
router.patch('/comments/:commentId/status', toggleCommentStatus);
router.delete('/comments/:commentId', deleteComment);
router.get('/', getPaginatedArticles);

export default router;