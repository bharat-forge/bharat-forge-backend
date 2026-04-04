import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { categories, products } from '../../db/schema';
import { eq, ne, and, or, ilike, sql, desc, asc } from 'drizzle-orm';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, slug, description, imageUrl, searchBlueprint } = req.body;

        const newCategory = await db.insert(categories).values({
            name,
            slug,
            description,
            imageUrl,
            searchBlueprint,
            status: 'ACTIVE'
        }).returning();

        res.status(201).json(newCategory[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getPaginatedCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const status = req.query.status as string;

        const conditions = [];

        if (status) {
            conditions.push(eq(categories.status, status as any));
        } else {
            conditions.push(ne(categories.status, 'DELETED'));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(categories.name, `%${search}%`),
                    ilike(categories.description, `%${search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db.select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            imageUrl: categories.imageUrl,
            searchBlueprint: categories.searchBlueprint,
            status: categories.status,
            createdAt: categories.createdAt,
            productCount: sql<number>`count(${products.id})::int`
        })
            .from(categories)
            .leftJoin(products, eq(categories.id, products.categoryId))
            .where(whereClause)
            .groupBy(categories.id)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(categories.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(categories)
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
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { [key: string]: string };

        const result = await db.select({
            category: categories,
            productCount: sql<number>`count(${products.id})::int`
        })
            .from(categories)
            .leftJoin(products, eq(categories.id, products.categoryId))
            .where(eq(categories.id, id))
            .groupBy(categories.id);

        if (result.length === 0) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }

        res.status(200).json(result[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateCategoryDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { [key: string]: string };
        const { name, slug, description, imageUrl } = req.body;

        const targetCategory = await db.select().from(categories).where(eq(categories.id, id));

        if (targetCategory.length === 0) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }

        if (targetCategory[0].status === 'ARCHIVED' || targetCategory[0].status === 'DELETED') {
            res.status(403).json({ message: `Cannot edit a category in ${targetCategory[0].status} state.` });
            return;
        }

        const updatedCategory = await db.update(categories).set({
            name,
            slug,
            description,
            imageUrl,
            updatedAt: new Date()
        })
            .where(eq(categories.id, id))
            .returning();

        res.status(200).json(updatedCategory[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateSearchBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { [key: string]: string };
        const { searchBlueprint } = req.body;

        const targetCategory = await db.select().from(categories).where(eq(categories.id, id));

        if (targetCategory.length === 0) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }

        if (targetCategory[0].status === 'ARCHIVED' || targetCategory[0].status === 'DELETED') {
            res.status(403).json({ message: `Cannot modify blueprints for a category in ${targetCategory[0].status} state.` });
            return;
        }

        const updatedCategory = await db.update(categories).set({
            searchBlueprint,
            updatedAt: new Date()
        })
            .where(eq(categories.id, id))
            .returning();

        res.status(200).json(updatedCategory[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateCategoryStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { [key: string]: string };
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'DISABLED', 'ARCHIVED', 'DELETED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status transition' });
            return;
        }

        const updateData: any = { status, updatedAt: new Date() };

        if (status === 'DELETED') {
            updateData.deletedAt = new Date();
        } else {
            updateData.deletedAt = null;
        }

        const updatedCategory = await db.update(categories)
            .set(updateData)
            .where(eq(categories.id, id))
            .returning();

        if (updatedCategory.length === 0) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }

        res.status(200).json(updatedCategory[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const hardDeleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { [key: string]: string };

        const linkedProducts = await db.select({ count: sql<number>`count(*)::int` })
            .from(products)
            .where(eq(products.categoryId, id));

        if (linkedProducts[0].count > 0) {
            res.status(409).json({
                message: 'Conflict: Cannot hard delete category. Products are still linked to it.',
                impactCount: linkedProducts[0].count
            });
            return;
        }

        await db.delete(categories).where(eq(categories.id, id));

        res.status(200).json({ message: 'Category permanently hard deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};