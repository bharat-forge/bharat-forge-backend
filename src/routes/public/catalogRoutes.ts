import { Router } from 'express';
import { browseProducts, getCategories, getProductDetails } from '../../controllers/public/catalogController';

const router = Router();

router.get('/browse', browseProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductDetails);

export default router;