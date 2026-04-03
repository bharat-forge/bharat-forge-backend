import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { articles, articleToCategories, articleCategories, users, articleComments } from '../../db/schema';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';

export const getPaginatedArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const categorySlug = req.query.categorySlug as string;

        const conditions = [eq(articles.status, 'PUBLISHED')];

        if (search) {
            conditions.push(or(ilike(articles.title, `%${search}%`), ilike(articles.content, `%${search}%`)) as any);
        }

        let baseQuery = db.select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            thumbnailUrl: articles.thumbnailUrl,
            viewsCount: articles.viewsCount,
            likesCount: articles.likesCount,
            publishedAt: articles.publishedAt,
            authorName: users.email
        })
            .from(articles)
            .leftJoin(users, eq(articles.authorId, users.id));

        if (categorySlug) {
            baseQuery = baseQuery
                .innerJoin(articleToCategories, eq(articles.id, articleToCategories.articleId))
                .innerJoin(articleCategories, and(eq(articleToCategories.categoryId, articleCategories.id), eq(articleCategories.slug, categorySlug)));
        }

        const results = await baseQuery
            .where(and(...conditions))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(articles.publishedAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(articles).where(and(...conditions));

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

export const getTrendingArticles = async (req: Request, res: Response): Promise<void> => {
    try {
        const results = await db.select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            thumbnailUrl: articles.thumbnailUrl,
            viewsCount: articles.viewsCount,
            publishedAt: articles.publishedAt
        })
            .from(articles)
            .where(eq(articles.status, 'PUBLISHED'))
            .orderBy(desc(sql`${articles.viewsCount} + (${articles.likesCount} * 2)`))
            .limit(5);

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getArticleBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
        const { slug } = req.params;

        const articleResult = await db.select({
            id: articles.id,
            title: articles.title,
            slug: articles.slug,
            content: articles.content,
            thumbnailUrl: articles.thumbnailUrl,
            supportingImages: articles.supportingImages,
            viewsCount: articles.viewsCount,
            likesCount: articles.likesCount,
            dislikesCount: articles.dislikesCount,
            publishedAt: articles.publishedAt,
            authorEmail: users.email
        })
            .from(articles)
            .leftJoin(users, eq(articles.authorId, users.id))
            .where(and(eq(articles.slug, slug), eq(articles.status, 'PUBLISHED')));

        if (articleResult.length === 0) {
            res.status(404).json({ message: 'Article not found' });
            return;
        }

        await db.update(articles)
            .set({ viewsCount: sql`${articles.viewsCount} + 1` })
            .where(eq(articles.id, articleResult[0].id));

        const comments = await db.select({
            id: articleComments.id,
            comment: articleComments.comment, 
            createdAt: articleComments.createdAt,
            userEmail: users.email
        })
            .from(articleComments)
            .leftJoin(users, eq(articleComments.userId, users.id))
            .where(and(eq(articleComments.articleId, articleResult[0].id), eq(articleComments.status, 'ACTIVE')))
            .orderBy(desc(articleComments.createdAt));

        res.status(200).json({
            article: articleResult[0],
            comments
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};