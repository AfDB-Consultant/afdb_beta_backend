import { Response } from 'express';
import { mfaService } from '../services/mfa.service';
import { AuthRequest } from '../types';

export class MfaController {
  async setup(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    const { secret, qrCode } = await mfaService.generateSecret(req.user._id.toString(), req.user.email);
    res.json({ success: true, data: { secret, qrCode } });
  }

  async verify(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    const { token } = req.body;
    const isValid = await mfaService.verify(req.user._id.toString(), token);
    if (!isValid) { res.status(400).json({ success: false, message: 'Invalid code' }); return; }
    await mfaService.enable(req.user._id.toString());
    res.json({ success: true, message: 'MFA enabled successfully' });
  }

  async disable(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    await mfaService.disable(req.user._id.toString());
    res.json({ success: true, message: 'MFA disabled' });
  }
}

export const mfaController = new MfaController();
