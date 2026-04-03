import { Router } from 'express';
import { requestDealership, getMyProductRequests, cancelDealershipRequest } from '../../controllers/dealer/dealershipRequestController';
import { protect } from '../../middlewares/authMiddleware';
import { authorize } from '../../middlewares/roleMiddleware';

const router = Router();
router.use(protect, authorize('DEALER'));

router.post('/request', requestDealership);
router.get('/my-requests', getMyProductRequests);
router.delete('/request/:productId', cancelDealershipRequest);

export default router;