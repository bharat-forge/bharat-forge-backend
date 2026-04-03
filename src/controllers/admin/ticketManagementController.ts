import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { supportTickets, users } from '../../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const whereClause = status ? eq(supportTickets.status, status as any) : undefined;

    const results = await db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      status: supportTickets.status,
      callbackRequested: supportTickets.callbackRequested,
      createdAt: supportTickets.createdAt,
      creatorEmail: users.email,
      creatorRole: users.role
    })
      .from(supportTickets)
      .innerJoin(users, eq(supportTickets.creatorId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(supportTickets.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(whereClause);

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

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params as { [key: string]: string };
    const { status } = req.body;

    await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
    res.status(200).json({ message: `Ticket marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};