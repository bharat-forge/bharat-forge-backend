import { Response } from 'express';
import { db } from '../../configs/db';
import { termsConditions } from '../../db/schema/terms/term.schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getPaginatedTerms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const results = await db.select()
      .from(termsConditions)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(termsConditions.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(termsConditions);

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

export const createTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { version, title, content } = req.body;
    const newTerm = await db.insert(termsConditions).values({
      version, title, content, isActive: false
    }).returning();
    res.status(201).json(newTerm[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'Version already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, content } = req.body;
    const updatedTerm = await db.update(termsConditions)
      .set({ title, content, updatedAt: new Date() })
      .where(eq(termsConditions.id, id))
      .returning();
    
    if (updatedTerm.length === 0) {
      res.status(404).json({ message: 'Term not found' });
      return;
    }
    res.status(200).json(updatedTerm[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const activateTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await db.transaction(async (tx) => {
      await tx.update(termsConditions).set({ isActive: false });
      await tx.update(termsConditions).set({ isActive: true, updatedAt: new Date() }).where(eq(termsConditions.id, id));
    });
    res.status(200).json({ message: 'Term activated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTerm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const term = await db.select().from(termsConditions).where(eq(termsConditions.id, id));
    if (term.length > 0 && term[0].isActive) {
       res.status(400).json({ message: 'Cannot delete the currently active term' });
       return;
    }

    const deleted = await db.delete(termsConditions).where(eq(termsConditions.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ message: 'Term not found' });
      return;
    }
    res.status(200).json({ message: 'Term deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};