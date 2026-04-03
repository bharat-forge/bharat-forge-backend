import { Response } from 'express';
import { db } from '../../configs/db';
import { supportTickets, ticketMessages, users } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { subject, description, orderId, callbackRequested } = req.body;

    const newTicket = await db.insert(supportTickets).values({
      creatorId: userId,
      subject,
      description,
      orderId,
      callbackRequested: callbackRequested || false
    }).returning();

    res.status(201).json(newTicket[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const results = await db.select().from(supportTickets)
      .where(eq(supportTickets.creatorId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(supportTickets.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(eq(supportTickets.creatorId, userId));

    res.status(200).json({
      data: results,
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

export const getTicketDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params as { [key: string]: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    
    if (ticket.length === 0 || (ticket[0].creatorId !== userId && req.user.role !== 'ADMIN')) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const messages = await db.select({
      id: ticketMessages.id,
      message: ticketMessages.message,
      createdAt: ticketMessages.createdAt,
      senderId: ticketMessages.senderId,
      senderRole: users.role
    })
    .from(ticketMessages)
    .innerJoin(users, eq(ticketMessages.senderId, users.id))
    .where(eq(ticketMessages.ticketId, ticketId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(ticketMessages.createdAt));

    res.status(200).json({ ticket: ticket[0], messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const postTicketMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params as { [key: string]: string };
    const { message } = req.body;

    const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    
    if (ticket.length === 0 || (ticket[0].creatorId !== userId && req.user.role !== 'ADMIN')) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    if (ticket[0].status === 'CLOSED' || ticket[0].status === 'RESOLVED') {
      res.status(400).json({ message: 'Cannot reply to a resolved or closed ticket' });
      return;
    }

    const newMessage = await db.insert(ticketMessages).values({
      ticketId,
      senderId: userId,
      message
    }).returning();

    res.status(201).json(newMessage[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resolveMyTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params as { [key: string]: string };

    const ticket = await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.creatorId, userId)));
    
    if (ticket.length === 0) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    await db.update(supportTickets).set({ status: 'RESOLVED', updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));

    res.status(200).json({ message: 'Ticket resolved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const requestCallback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params as { [key: string]: string };

    await db.update(supportTickets).set({ callbackRequested: true, updatedAt: new Date() }).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.creatorId, userId)));

    res.status(200).json({ message: 'Callback requested' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};