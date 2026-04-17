import { Router } from 'express';
import { getPaginatedFaqsAdmin, getUniqueCategories, createFaq, updateFaq, deleteFaq } from '../../controllers/admin/faqManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/categories', getUniqueCategories);
router.get('/', getPaginatedFaqsAdmin);
router.post('/', createFaq);
router.put('/:id', updateFaq);
router.delete('/:id', deleteFaq);

export default router;