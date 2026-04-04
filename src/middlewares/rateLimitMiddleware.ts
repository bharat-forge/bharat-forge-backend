import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // This ensures the limiter doesn't crash if the proxy header is weird
  validate: { trustProxy: true }, 
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  // Explicitly handle the key generator to ensure it grabs the right IP from Render
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'default-ip';
  }
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  validate: { trustProxy: true },
  message: { message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'default-ip';
  }
});