import { Router } from 'express';
import { submitContactRequest } from '../../controllers/public/contactRequestController';

const router = Router();

router.post('/', submitContactRequest);

export default router;