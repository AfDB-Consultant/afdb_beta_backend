import { Request, Response } from 'express';
import { Message } from '../models/message.model';
import { User } from '../models/user.model';
import { AuthRequest } from '../types';
import { logger } from '../config/logger';

/**
 * GET /api/v1/messenger/contacts
 * Get all users except the current user (contacts list)
 */
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as AuthRequest).user?._id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
    }).select('firstName lastName email role lastLogin');

    const contacts = users.map((u) => ({
      id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      is_online: u.lastLogin ? (Date.now() - new Date(u.lastLogin).getTime()) < 300000 : false, // Online if active in last 5 min
      lastLogin: u.lastLogin,
    }));

    res.json({ success: true, data: contacts });
  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
  }
};

/**
 * GET /api/v1/messenger/messages/:userId
 * Get messages between current user and specified user
 */
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as AuthRequest).user?._id;
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 30;

    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { from_id: currentUserId, to_id: userId },
        { from_id: userId, to_id: currentUserId },
      ],
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    // Get the other user's info
    const otherUser = await User.findById(userId).select('firstName lastName email');

    // Format messages with user info
    const formattedMessages = messages.map((m) => ({
      id: m._id.toString(),
      from_id: m.from_id,
      to_id: m.to_id,
      body: m.body,
      attachment: m.attachment,
      seen: m.seen,
      created_at: m.created_at,
      updated_at: m.updated_at,
      from_user: m.from_id === currentUserId
        ? { id: currentUserId, name: `${(req as AuthRequest).user?.firstName || ''} ${(req as AuthRequest).user?.lastName || ''}`.trim(), email: (req as AuthRequest).user?.email || '' }
        : { id: otherUser?._id.toString() || '', name: `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim(), email: otherUser?.email || '' },
      to_user: m.to_id === currentUserId
        ? { id: currentUserId, name: `${(req as AuthRequest).user?.firstName || ''} ${(req as AuthRequest).user?.lastName || ''}`.trim(), email: (req as AuthRequest).user?.email || '' }
        : { id: otherUser?._id.toString() || '', name: `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim(), email: otherUser?.email || '' },
    }));

    // Mark messages as seen if they're from the other user
    await Message.updateMany(
      { from_id: userId, to_id: currentUserId, seen: false },
      { $set: { seen: true } }
    );

    res.json({ success: true, data: formattedMessages.reverse() }); // Reverse to show oldest first
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

/**
 * POST /api/v1/messenger/send
 * Send a message to a user
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as AuthRequest).user?._id;
    const { receiver_id, message } = req.body;

    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!receiver_id || !message?.trim()) {
      res.status(400).json({ success: false, message: 'Receiver ID and message are required' });
      return;
    }

    // Verify receiver exists
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      res.status(404).json({ success: false, message: 'Receiver not found' });
      return;
    }

    // Create message
    const newMessage = await Message.create({
      from_id: currentUserId,
      to_id: receiver_id,
      body: message.trim(),
    });

    // Get sender info
    const sender = await User.findById(currentUserId).select('firstName lastName email');

    const formattedMessage = {
      id: newMessage._id.toString(),
      from_id: newMessage.from_id,
      to_id: newMessage.to_id,
      body: newMessage.body,
      seen: newMessage.seen,
      created_at: newMessage.created_at,
      from_user: {
        id: sender?._id.toString() || '',
        name: `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim(),
        email: sender?.email || '',
      },
      to_user: {
        id: receiver._id.toString(),
        name: `${receiver.firstName} ${receiver.lastName}`.trim(),
        email: receiver.email,
      },
    };

    res.status(201).json({ success: true, data: formattedMessage });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * GET /api/v1/messenger/unread-count
 * Get total unread message count for current user
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = (req as AuthRequest).user?._id;

    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const count = await Message.countDocuments({
      to_id: currentUserId,
      seen: false,
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};
