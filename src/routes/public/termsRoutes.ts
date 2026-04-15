import { Router } from 'express';
import { getActiveTerm } from '../../controllers/public/termsController';

const router = Router();

router.get('/active', getActiveTerm);

export default router;