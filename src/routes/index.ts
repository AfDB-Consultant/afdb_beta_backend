import { Router } from 'express';
import authRoutes from './auth.routes';
import mfaRoutes from './mfa.routes';
import ssoRoutes from './sso.routes';
import messengerRoutes from './messenger.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/mfa', mfaRoutes);
router.use('/sso', ssoRoutes);
router.use('/messenger', messengerRoutes);

export default router;
