import { Router } from 'express';
import { getPaginatedArticles, getTrendingArticles, getArticleBySlug } from '../../controllers/public/articleController';

const router = Router();

router.get('/', getPaginatedArticles);
router.get('/trending', getTrendingArticles);
router.get('/:slug', getArticleBySlug);

export default router;