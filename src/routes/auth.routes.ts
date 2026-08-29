import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { otpController } from '../controllers/otp.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     description: Authenticates user with credentials. Returns tokens or prompts for MFA if enabled.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@afdb.org
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful (tokens returned or MFA required)
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 *       429:
 *         description: Too many attempts
 */
router.post('/login', loginLimiter, authController.login.bind(authController));

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account
 *     description: Creates a new user account with email, password, and optional profile fields.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       409:
 *         description: Email already registered
 */
router.post('/signup', loginLimiter, authController.signup.bind(authController));

/**
 * @openapi
 * /auth/verify-mfa:
 *   post:
 *     tags: [Auth]
 *     summary: Verify MFA code during login
 *     description: Validates a TOTP or backup code to complete MFA authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *               isBackupCode:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: MFA verified, tokens returned
 *       401:
 *         description: Invalid MFA code
 */
router.post('/verify-mfa', authController.verifyMfa.bind(authController));

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change authenticated user's password
 *     description: Updates the password for the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password incorrect
 */
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Exchanges a valid refresh token for a new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke tokens
 *     description: Invalidates the current refresh token and logs the user out.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile data.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, authController.me.bind(authController));

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for 2FA setup
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post('/send-otp', authenticate, otpController.sendOtp.bind(otpController));

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for 2FA setup
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified, 2FA enabled
 *       401:
 *         description: Invalid OTP
 */
router.post('/verify-otp', authenticate, otpController.verifyOtp.bind(otpController));

// Login OTP (2FA via email)
router.post('/send-login-otp', otpController.sendLoginOtp.bind(otpController));
router.post('/verify-login-otp', otpController.verifyLoginOtp.bind(otpController));

// Register OTP (email verification)
router.post('/send-register-otp', otpController.sendRegisterOtp.bind(otpController));
router.post('/verify-register-otp', otpController.verifyRegisterOtp.bind(otpController));

// Password Reset OTP
router.post('/send-reset-otp', otpController.sendResetOtp.bind(otpController));
router.post('/verify-reset-otp', otpController.verifyResetOtp.bind(otpController));

export default router;
