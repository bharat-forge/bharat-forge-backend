import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { articleCategories, articleToCategories } from '../../db/schema';
import { eq, sql, ilike, or, and, desc } from 'drizzle-orm';

export const getPaginatedCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const conditions = [];

    if (status) {
      conditions.push(eq(articleCategories.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(articleCategories.name, `%${search}%`),
          ilike(articleCategories.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select()
      .from(articleCategories)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(articleCategories.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(articleCategories)
      .where(whereClause);

    const totalCount = totalCountQuery[0].count;

    res.status(200).json({
      data: results,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug } = req.body;
    const newCategory = await db.insert(articleCategories).values({ name, slug }).returning();
    res.status(201).json(newCategory[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };
    const { name, slug, status } = req.body;

    const updated = await db.update(articleCategories)
      .set({ name, slug, status, updatedAt: new Date() })
      .where(eq(articleCategories.id, id))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.status(200).json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };


    const linkedArticles = await db.select({ count: sql<number>`count(*)::int` })
      .from(articleToCategories)
      .where(eq(articleToCategories.categoryId, id));

    if (linkedArticles[0].count > 0) {
      res.status(409).json({ message: 'Cannot delete category with linked articles. Disable it instead.' });
      return;
    }

    await db.delete(articleCategories).where(eq(articleCategories.id, id));
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};