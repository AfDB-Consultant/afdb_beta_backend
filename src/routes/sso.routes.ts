import { Router } from 'express';
import { ssoController } from '../controllers/sso.controller';

const router = Router();

router.post('/handoff', ssoController.handoff.bind(ssoController));
router.post('/generate', ssoController.generateHandoff.bind(ssoController));

export default router;
