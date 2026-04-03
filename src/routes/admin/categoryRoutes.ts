import { Router } from 'express';
import { 
  createCategory,
  getPaginatedCategories,
  getCategoryById,
  updateCategoryDetails,
  updateSearchBlueprint,
  updateCategoryStatus,
  hardDeleteCategory
} from '../../controllers/admin/categoryController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.post('/', createCategory);
router.get('/', getPaginatedCategories);
router.get('/:id', getCategoryById);
router.patch('/:id/details', updateCategoryDetails);
router.put('/:id/blueprint', updateSearchBlueprint);
router.patch('/:id/status', updateCategoryStatus);
router.delete('/:id/hard-delete', hardDeleteCategory);

export default router;