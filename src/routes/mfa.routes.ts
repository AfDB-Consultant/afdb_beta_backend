import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /mfa/setup:
 *   post:
 *     tags: [MFA]
 *     summary: Initialize MFA setup for user
 *     description: Generates a TOTP secret and QR code URI for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA setup data with secret and QR URI
 */
router.post('/setup', authenticate, mfaController.setup.bind(mfaController));

/**
 * @openapi
 * /mfa/verify:
 *   post:
 *     tags: [MFA]
 *     summary: Verify TOTP code and enable MFA
 *     description: Validates a TOTP code to confirm and activate MFA for the user.
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
 *         description: MFA verified and enabled
 *       401:
 *         description: Invalid TOTP code
 */
router.post('/verify', authenticate, mfaController.verify.bind(mfaController));

/**
 * @openapi
 * /mfa/verify-backup:
 *   post:
 *     tags: [MFA]
 *     summary: Verify a backup code
 *     description: Validates a single-use backup code as an alternative to TOTP.
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
 *     responses:
 *       200:
 *         description: Backup code valid
 *       401:
 *         description: Invalid or already used backup code
 */
router.post('/verify-backup', authenticate, mfaController.verifyBackupCode.bind(mfaController));

/**
 * @openapi
 * /mfa/regenerate-backup-codes:
 *   post:
 *     tags: [MFA]
 *     summary: Regenerate backup codes
 *     description: Invalidates existing backup codes and generates new ones.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New backup codes generated
 */
router.post('/regenerate-backup-codes', authenticate, mfaController.regenerateBackupCodes.bind(mfaController));

/**
 * @openapi
 * /mfa/status:
 *   get:
 *     tags: [MFA]
 *     summary: Get MFA status
 *     description: Returns whether MFA is enabled and configured for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA status data
 */
router.get('/status', authenticate, mfaController.status.bind(mfaController));

/**
 * @openapi
 * /mfa/disable:
 *   post:
 *     tags: [MFA]
 *     summary: Disable MFA
 *     description: Disables MFA for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 */
router.post('/disable', authenticate, mfaController.disable.bind(mfaController));

export default router;
