import { Response } from 'express';
import { db } from '../../configs/db';
import { contactRequests } from '../../db/schema/contact/contact.schema';
import { eq, desc, sql, ilike, or } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getPaginatedContactRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let baseQuery = db.select().from(contactRequests);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(contactRequests);

    if (search) {
      const searchCondition = or(
        ilike(contactRequests.name, `%${search}%`),
        ilike(contactRequests.email, `%${search}%`),
        ilike(contactRequests.company, `%${search}%`)
      );
      
      baseQuery = baseQuery.where(searchCondition) as any;
      countQuery = countQuery.where(searchCondition) as any;
    }

    const results = await baseQuery
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contactRequests.createdAt));

    const totalCountResult = await countQuery;

    res.status(200).json({
      data: results,
      meta: {
        totalCount: totalCountResult[0].count,
        totalPages: Math.ceil(totalCountResult[0].count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateContactRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const updatedRequest = await db.update(contactRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactRequests.id, id))
      .returning();
    
    if (updatedRequest.length === 0) {
      res.status(404).json({ message: 'Contact request not found' });
      return;
    }
    
    res.status(200).json(updatedRequest[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteContactRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const deleted = await db.delete(contactRequests).where(eq(contactRequests.id, id)).returning();
    
    if (deleted.length === 0) {
      res.status(404).json({ message: 'Contact request not found' });
      return;
    }
    
    res.status(200).json({ message: 'Contact request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};