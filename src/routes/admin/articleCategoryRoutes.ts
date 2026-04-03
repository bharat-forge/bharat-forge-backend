import { Router } from 'express';
import { createCategory, updateCategory, deleteCategory, getPaginatedCategories } from '../../controllers/admin/articleCategoryController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.get('/', getPaginatedCategories);


export default router;