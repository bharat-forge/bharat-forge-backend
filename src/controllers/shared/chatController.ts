import { Response } from 'express';
import { db } from '../../configs/db';
import { chatMessages, users, dealerProfiles } from '../../db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

const checkMessagingRules = async (senderId: string, senderRole: string, receiverId: string): Promise<boolean> => {
  const receiver = await db.select().from(users).where(eq(users.id, receiverId));
  if (receiver.length === 0) return false;
  
  const receiverRole = receiver[0].role;

  if (senderRole === 'USER' && receiverRole === 'ADMIN') return false;
  if (senderRole === 'USER' && receiverRole === 'DEALER') return true;
  if (senderRole === 'DEALER' && receiverRole === 'ADMIN') return true;
  if (senderRole === 'ADMIN' && receiverRole === 'DEALER') return true;
  if (senderRole === 'ADMIN' && receiverRole === 'USER') return true;

  if (senderRole === 'DEALER' && receiverRole === 'USER') {
    const priorHistory = await db.select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(eq(chatMessages.senderId, receiverId), eq(chatMessages.receiverId, senderId)));
    return priorHistory[0].count > 0;
  }

  return false;
};

export const initializeChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
        res.status(400).json({ message: 'Target User ID is required' });
        return;
    }

    const contactUser = await db.select().from(users).where(eq(users.id, targetUserId));
    if (contactUser.length === 0) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    
    let displayName = contactUser[0]?.email;
    const meta = contactUser[0]?.metadata as any;
    if (meta?.firstName) displayName = `${meta.firstName} ${meta.lastName || ''}`;

    if (contactUser[0].role === 'DEALER') {
        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, targetUserId));
        if (dealer.length > 0) {
            displayName = dealer[0].businessName;
        }
    }

    res.status(200).json({
      contactId: targetUserId,
      displayName: displayName?.trim() || 'Unknown',
      role: contactUser[0]?.role,
      unreadCount: 0,
      lastInteraction: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user.id;
    const senderRole = req.user.role;
    const { receiverId, content } = req.body;

    const isAllowed = await checkMessagingRules(senderId, senderRole, receiverId);
    if (!isAllowed) {
      res.status(403).json({ message: 'Messaging policy strictly blocks this action.' });
      return;
    }

    const newMessage = await db.insert(chatMessages).values({
      senderId,
      receiverId,
      content,
      deliveryStatus: 'SENT'
    }).returning();

    res.status(201).json(newMessage[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const conditions = or(
      and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, targetUserId)),
      and(eq(chatMessages.senderId, targetUserId), eq(chatMessages.receiverId, userId))
    );

    const messages = await db.select().from(chatMessages)
      .where(conditions)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(chatMessages.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(chatMessages).where(conditions);

    res.status(200).json({
      data: messages,
      meta: {
        totalCount: totalCountQuery[0].count,
        totalPages: Math.ceil(totalCountQuery[0].count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMessageStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { status } = req.body; 

    await db.update(chatMessages).set({ deliveryStatus: status as any }).where(eq(chatMessages.id, messageId));
    
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const rawQuery = sql`
      SELECT DISTINCT ON (contact_id)
        contact_id,
        last_interaction
      FROM (
        SELECT 
          CASE 
            WHEN sender_id = ${userId}::uuid THEN receiver_id 
            ELSE sender_id 
          END as contact_id,
          created_at as last_interaction
        FROM chat_messages
        WHERE sender_id = ${userId}::uuid OR receiver_id = ${userId}::uuid
      ) sub
      ORDER BY contact_id, last_interaction DESC
    `;

    const distinctContacts = await db.execute(rawQuery);

    const formattedConversations = await Promise.all(distinctContacts.rows.map(async (row: any) => {
      const contactUser = await db.select().from(users).where(eq(users.id, row.contact_id));
      if (!contactUser.length) return null;

      let displayName = contactUser[0].email;
      const meta = contactUser[0].metadata as any;
      if (meta?.firstName) displayName = `${meta.firstName} ${meta.lastName || ''}`;
      if (contactUser[0].role === 'ADMIN') displayName = 'Bharat Forge Support';

      const unreadCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(and(
          eq(chatMessages.senderId, row.contact_id),
          eq(chatMessages.receiverId, userId),
          eq(chatMessages.deliveryStatus, 'SENT')
        ));

      return {
        contactId: row.contact_id,
        displayName: displayName.trim(),
        role: contactUser[0].role,
        lastInteraction: row.last_interaction,
        unreadCount: unreadCount[0].count
      };
    }));

    res.status(200).json(formattedConversations.filter(c => c !== null));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};