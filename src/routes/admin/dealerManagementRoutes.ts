import { Router } from 'express';
import { 
  createVerificationBlueprint,
  getVerificationBlueprints,
  getVerificationBlueprintById,
  updateVerificationBlueprint,
  toggleBlueprintStatus,
  hardDeleteBlueprint,
  getPaginatedDealers,
  getDealerComplianceDetails,
  reviewDealerSubmission,
  updateDealerSuspensionStatus,
  getAdminDealerInventory,
  getAdminDealerSalesHistory
} from '../../controllers/admin/dealerManagementController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.post('/blueprints', createVerificationBlueprint);
router.get('/blueprints', getVerificationBlueprints);
router.get('/blueprints/:id', getVerificationBlueprintById);
router.put('/blueprints/:id', updateVerificationBlueprint);
router.patch('/blueprints/:id/status', toggleBlueprintStatus);
router.delete('/blueprints/:id', hardDeleteBlueprint);

router.get('/dealers', getPaginatedDealers);
router.get('/dealers/:dealerId/compliance', getDealerComplianceDetails);
router.patch('/submissions/:submissionId/review', reviewDealerSubmission);
router.patch('/dealers/:dealerId/suspend', updateDealerSuspensionStatus);

router.get('/dealers/:dealerId/inventory', getAdminDealerInventory);
router.get('/dealers/:dealerId/sales', getAdminDealerSalesHistory);
export default router;