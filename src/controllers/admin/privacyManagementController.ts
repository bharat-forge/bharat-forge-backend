import { Response } from 'express';
import { db } from '../../configs/db';
import { privacyPolicies } from '../../db/schema/privacy/privacy.schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getPaginatedPolicies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const results = await db.select()
      .from(privacyPolicies)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(privacyPolicies.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(privacyPolicies);

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

export const createPolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { version, title, content } = req.body;
    const newPolicy = await db.insert(privacyPolicies).values({
      version, title, content, isActive: false
    }).returning();
    res.status(201).json(newPolicy[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({ message: 'Version already exists' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, content } = req.body;
    const updatedPolicy = await db.update(privacyPolicies)
      .set({ title, content, updatedAt: new Date() })
      .where(eq(privacyPolicies.id, id))
      .returning();
    
    if (updatedPolicy.length === 0) {
      res.status(404).json({ message: 'Privacy policy not found' });
      return;
    }
    res.status(200).json(updatedPolicy[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const activatePolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await db.transaction(async (tx) => {
      await tx.update(privacyPolicies).set({ isActive: false });
      await tx.update(privacyPolicies).set({ isActive: true, updatedAt: new Date() }).where(eq(privacyPolicies.id, id));
    });
    res.status(200).json({ message: 'Privacy policy activated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePolicy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const policy = await db.select().from(privacyPolicies).where(eq(privacyPolicies.id, id));
    if (policy.length > 0 && policy[0].isActive) {
       res.status(400).json({ message: 'Cannot delete the currently active privacy policy' });
       return;
    }

    const deleted = await db.delete(privacyPolicies).where(eq(privacyPolicies.id, id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ message: 'Privacy policy not found' });
      return;
    }
    res.status(200).json({ message: 'Privacy policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};