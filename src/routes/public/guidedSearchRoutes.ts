import { Router } from 'express';
import { getSearchBlueprints, getDynamicOptions, findMatchingProducts } from '../../controllers/public/guidedSearchController';

const router = Router();

router.get('/blueprints', getSearchBlueprints);
router.post('/categories/:categoryId/options', getDynamicOptions);
router.post('/categories/:categoryId/results', findMatchingProducts);

export default router;