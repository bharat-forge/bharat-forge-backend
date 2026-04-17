import { Router } from 'express';
import { getPaginatedFaqs, getFaqById, getRelatedFaqs } from '../../controllers/public/faqController';

const router = Router();

router.get('/', getPaginatedFaqs);
router.get('/:id/related', getRelatedFaqs);
router.get('/:id', getFaqById);

export default router;