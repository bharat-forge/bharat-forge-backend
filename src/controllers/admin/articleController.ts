import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { articles, articleToCategories, articleCategories, articleComments, users } from '../../db/schema';
import { eq, sql, ilike, or, and, desc } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/uploadService';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getPaginatedArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const conditions = [];

    if (status) {
      conditions.push(eq(articles.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(articles.title, `%${search}%`),
          ilike(articles.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select()
      .from(articles)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(articles.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(whereClause);

    const totalCount = totalCountQuery[0].count;

    const articlesWithCategories = await Promise.all(results.map(async (article) => {
      const categories = await db.select({
        categoryId: articleToCategories.categoryId,
        name: articleCategories.name
      })
      .from(articleToCategories)
      .innerJoin(articleCategories, eq(articleToCategories.categoryId, articleCategories.id))
      .where(eq(articleToCategories.articleId, article.id));

      const commentCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(articleComments)
        .where(eq(articleComments.articleId, article.id));

      return { ...article, categories, commentCount: commentCount[0].count };
    }));

    res.status(200).json({
      data: articlesWithCategories,
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

export const createArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, slug, content, status, categoryIds } = req.body;
    const authorId = req.user.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let thumbnailUrl = '';
    if (files?.thumbnail && files.thumbnail.length > 0) {
      thumbnailUrl = await uploadFileToS3(files.thumbnail[0].buffer, files.thumbnail[0].originalname, files.thumbnail[0].mimetype, 'articles');
    }

    let supportingImages: string[] = [];
    if (files?.supportingImages && files.supportingImages.length > 0) {
      supportingImages = await Promise.all(
        files.supportingImages.slice(0, 3).map(file =>
          uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'articles')
        )
      );
    }

    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    const newArticleRecord = await db.transaction(async (tx) => {
      const newArticle = await tx.insert(articles).values({
        title, slug, content, thumbnailUrl, supportingImages, authorId, status, publishedAt
      }).returning();

      const parsedCategoryIds = typeof categoryIds === 'string' ? JSON.parse(categoryIds) : categoryIds;
      if (parsedCategoryIds && parsedCategoryIds.length > 0) {
        for (const catId of parsedCategoryIds) {
          await tx.insert(articleToCategories).values({
            articleId: newArticle[0].id,
            categoryId: catId
          });
        }
      }
      return newArticle[0];
    });

    res.status(201).json(newArticleRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };
    const { title, slug, content, status, categoryIds } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const currentArticle = await db.select().from(articles).where(eq(articles.id, id));
    if (currentArticle.length === 0) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    let thumbnailUrl = currentArticle[0].thumbnailUrl;
    if (files?.thumbnail && files.thumbnail.length > 0) {
      thumbnailUrl = await uploadFileToS3(files.thumbnail[0].buffer, files.thumbnail[0].originalname, files.thumbnail[0].mimetype, 'articles');
    }

    let supportingImages = currentArticle[0].supportingImages || [];
    if (files?.supportingImages && files.supportingImages.length > 0) {
      supportingImages = await Promise.all(
        files.supportingImages.slice(0, 3).map(file =>
          uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'articles')
        )
      );
    }

    const publishedAt = status === 'PUBLISHED' && !currentArticle[0].publishedAt ? new Date() : currentArticle[0].publishedAt;

    const updated = await db.transaction(async (tx) => {
      const updatedArticle = await tx.update(articles)
        .set({ title, slug, content, status, publishedAt, thumbnailUrl, supportingImages, updatedAt: new Date() })
        .where(eq(articles.id, id))
        .returning();

      if (categoryIds) {
        await tx.delete(articleToCategories).where(eq(articleToCategories.articleId, id));
        const parsedCategoryIds = typeof categoryIds === 'string' ? JSON.parse(categoryIds) : categoryIds;
        for (const catId of parsedCategoryIds) {
          await tx.insert(articleToCategories).values({
            articleId: id,
            categoryId: catId
          });
        }
      }

      return updatedArticle[0];
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateArticleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };
    const { status } = req.body;

    const currentArticle = await db.select().from(articles).where(eq(articles.id, id));
    if (currentArticle.length === 0) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    const publishedAt = status === 'PUBLISHED' && !currentArticle[0].publishedAt ? new Date() : currentArticle[0].publishedAt;

    const updated = await db.update(articles)
      .set({ status, publishedAt, updatedAt: new Date() })
      .where(eq(articles.id, id))
      .returning();

    res.status(200).json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getArticleComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const results = await db.select({
      id: articleComments.id,
      comment: articleComments.comment,
      status: articleComments.status,
      createdAt: articleComments.createdAt,
      userEmail: users.email
    })
    .from(articleComments)
    .innerJoin(users, eq(articleComments.userId, users.id))
    .where(eq(articleComments.articleId, id))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(articleComments.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(articleComments)
      .where(eq(articleComments.articleId, id));

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

export const toggleCommentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params as { [key: string]: string };
    const { status } = req.body;

    await db.update(articleComments)
      .set({ status, updatedAt: new Date() })
      .where(eq(articleComments.id, commentId));

    res.status(200).json({ message: `Comment status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params as { [key: string]: string };
    await db.delete(articleComments).where(eq(articleComments.id, commentId));
    res.status(200).json({ message: 'Comment permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};