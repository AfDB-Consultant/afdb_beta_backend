import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/setup', authenticate, mfaController.setup.bind(mfaController));
router.post('/verify', authenticate, mfaController.verify.bind(mfaController));
router.post('/verify-backup', authenticate, mfaController.verifyBackupCode.bind(mfaController));
router.post('/regenerate-backup-codes', authenticate, mfaController.regenerateBackupCodes.bind(mfaController));
router.get('/status', authenticate, mfaController.status.bind(mfaController));
router.post('/disable', authenticate, mfaController.disable.bind(mfaController));

export default router;
