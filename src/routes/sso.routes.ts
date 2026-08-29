import { Router } from 'express';
import { ssoController } from '../controllers/sso.controller';

const router = Router();

/**
 * @openapi
 * /sso/handoff:
 *   post:
 *     tags: [SSO]
 *     summary: SSO handoff from external IDP
 *     description: Accepts an SSO handoff token from a federated identity provider.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: SSO handoff successful
 *       401:
 *         description: Invalid handoff token
 */
router.post('/handoff', ssoController.handoff.bind(ssoController));

/**
 * @openapi
 * /sso/generate:
 *   post:
 *     tags: [SSO]
 *     summary: Generate SSO handoff token
 *     description: Generates a secure handoff token for SSO federation with core system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Handoff token generated
 */
router.post('/generate', ssoController.generateHandoff.bind(ssoController));

/**
 * @openapi
 * /sso/providers:
 *   get:
 *     tags: [SSO]
 *     summary: List available SSO providers
 *     description: Returns configured SSO identity providers (Google, Microsoft, etc.).
 *     responses:
 *       200:
 *         description: List of SSO providers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get('/providers', ssoController.getProviders.bind(ssoController));

/**
 * @openapi
 * /sso/initiate/{providerId}:
 *   get:
 *     tags: [SSO]
 *     summary: Initiate OAuth flow with provider
 *     description: Redirects to the OAuth authorization URL for the specified provider.
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft]
 *     responses:
 *       200:
 *         description: Authorization URL returned
 *       400:
 *         description: Unknown provider
 */
router.get('/initiate/:providerId', ssoController.initiateOAuth.bind(ssoController));

/**
 * @openapi
 * /sso/callback/{providerId}:
 *   get:
 *     tags: [SSO]
 *     summary: OAuth callback handler
 *     description: Handles the OAuth callback from the identity provider after user authorization.
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, microsoft]
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SSO authentication successful
 *       401:
 *         description: SSO authentication failed
 */
router.get('/callback/:providerId', ssoController.handleCallback.bind(ssoController));

export default router;
