import { Router } from 'express';
import { 
  getMyInventory, 
  logManualSale, 
  getMySalesHistory 
} from '../../controllers/dealer/inventoryManagement';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('DEALER'));

router.get('/', getMyInventory);
router.post('/sales', logManualSale);
router.get('/sales', getMySalesHistory);

export default router;