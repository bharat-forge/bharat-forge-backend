import { Router } from 'express';
import { getActivePolicy } from '../../controllers/public/privacyController';

const router = Router();

router.get('/active', getActivePolicy);

export default router;