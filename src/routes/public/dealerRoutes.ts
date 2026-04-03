import { Router } from 'express';
import { getActiveDealers, getDealerDetails } from '../../controllers/public/dealerController';

const router = Router();

router.get('/', getActiveDealers);
router.get('/:id', getDealerDetails);

export default router;