import { Router } from 'express';
import { 
  register, 
  login, 
  verifyOTP, 
  resendOTP, 
  forgotPassword, 
  resetPassword, 
  refreshAccessToken,
  logout
} from '../../controllers/auth/authController';
import { authLimiter, otpLimiter } from '../../middlewares/rateLimitMiddleware';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

export default router;