import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getContacts,
  getMessages,
  sendMessage,
  getUnreadCount,
} from '../controllers/messenger.controller';

const router = Router();

router.use(authenticate);

router.get('/contacts', getContacts);
router.get('/messages/:userId', getMessages);
router.post('/send', sendMessage);
router.get('/unread-count', getUnreadCount);

export default router;
