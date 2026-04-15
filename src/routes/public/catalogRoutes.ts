import { Router } from 'express';
import { browseProducts, getCategories, getProductDetails, getSimilarProducts } from '../../controllers/public/catalogController';

const router = Router();

router.get('/browse', browseProducts);
router.get('/categories', getCategories);
router.get('/:id/suggestions', getSimilarProducts); // Mount the new suggestion route
router.get('/:id', getProductDetails); 

export default router;