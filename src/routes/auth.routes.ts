import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', loginLimiter, authController.login.bind(authController));
router.post('/signup', loginLimiter, authController.signup.bind(authController));
router.post('/verify-mfa', authController.verifyMfa.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
