import { Router } from 'express';
import { getPaginatedTerms, createTerm, updateTerm, activateTerm, deleteTerm } from '../../controllers/admin/termsManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));


router.get('/', getPaginatedTerms);
router.post('/', createTerm);
router.put('/:id', updateTerm);
router.put('/:id/activate', activateTerm);
router.delete('/:id', deleteTerm);

export default router;