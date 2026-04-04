import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  // Removed custom keyGenerator: The default uses req.ip and normalizes IPv6 automatically
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  validate: { trustProxy: true },
  message: { message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Removed custom keyGenerator: The default uses req.ip and normalizes IPv6 automatically
});