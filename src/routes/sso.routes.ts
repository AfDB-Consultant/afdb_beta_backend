import { Router } from 'express';
import { ssoController } from '../controllers/sso.controller';

const router = Router();

router.post('/handoff', ssoController.handoff.bind(ssoController));
router.post('/generate', ssoController.generateHandoff.bind(ssoController));
router.get('/providers', ssoController.getProviders.bind(ssoController));
router.get('/initiate/:providerId', ssoController.initiateOAuth.bind(ssoController));
router.get('/callback/:providerId', ssoController.handleCallback.bind(ssoController));

export default router;
