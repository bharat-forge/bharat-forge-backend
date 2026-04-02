import { Router } from 'express';
import { createCategory, getCategories, updateCategory } from '../controllers/categoryController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/', getCategories);
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);

export default router;