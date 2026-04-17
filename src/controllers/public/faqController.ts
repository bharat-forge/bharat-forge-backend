import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { faqs } from '../../db/schema/faq/faq.schema';
import { eq, desc, sql, ilike, and, ne } from 'drizzle-orm';

export const getPaginatedFaqs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const offset = (page - 1) * limit;

    let conditions = [eq(faqs.isActive, true)];
    
    if (search) conditions.push(ilike(faqs.question, `%${search}%`));
    if (category) conditions.push(eq(faqs.category, category));

    const finalCondition = and(...conditions);

    const results = await db.select()
      .from(faqs)
      .where(finalCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(faqs.viewCount)); 

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(faqs)
      .where(finalCondition);

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

export const getFaqById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const updatedFaq = await db.update(faqs)
      .set({ viewCount: sql`${faqs.viewCount} + 1` })
      .where(and(eq(faqs.id, id), eq(faqs.isActive, true)))
      .returning();

    if (updatedFaq.length === 0) {
      res.status(404).json({ message: 'FAQ not found' });
      return;
    }

    res.status(200).json(updatedFaq[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getRelatedFaqs = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 3;

    if (!category) {
      res.status(400).json({ message: 'Category is required for related FAQs' });
      return;
    }

    const related = await db.select()
      .from(faqs)
      .where(and(
        eq(faqs.isActive, true),
        eq(faqs.category, category),
        ne(faqs.id, id)
      ))
      .orderBy(desc(faqs.viewCount))
      .limit(limit);

    res.status(200).json(related);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};