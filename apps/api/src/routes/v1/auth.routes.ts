import { Router } from 'express';
import { authController, sendOtpSchema, verifyOtpSchema } from '../../controllers/auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authLimiter, otpLimiter } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', authLimiter, authController.refreshTokens);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
