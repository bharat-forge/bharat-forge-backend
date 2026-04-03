import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { products, categories, dealerAuthorizedProducts, orderItems, productReviews, users } from '../../db/schema';
import { eq, ne, and, or, ilike, sql, desc } from 'drizzle-orm';
import { uploadFileToS3 } from '../../services/uploadService';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productData = req.body;
        const files = req.files as Express.Multer.File[];

        const categoryCheck = await db.select().from(categories).where(eq(categories.id, productData.categoryId));
        if (categoryCheck.length === 0 || categoryCheck[0].status !== 'ACTIVE') {
            res.status(400).json({ message: 'Invalid or inactive category selected.' });
            return;
        }

        let imageUrls: string[] = [];
        if (files && files.length > 0) {
            imageUrls = await Promise.all(
                files.map((file) => uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'products'))
            );
        }

        const safeParse = (data: any) => typeof data === 'string' ? JSON.parse(data) : (data || {});

        const newProduct = await db.insert(products).values({
            name: productData.name,
            sku: productData.sku,
            hsnCode: productData.hsnCode,
            categoryId: productData.categoryId,
            description: productData.description,
            images: imageUrls,
            basePrice: parseFloat(productData.basePrice),
            moq: parseInt(productData.moq) || 1,
            stock: parseInt(productData.stock) || 0,
            certifications: safeParse(productData.certifications),
            warrantyInfo: productData.warrantyInfo,
            specifications: safeParse(productData.specifications),
            compatibilities: safeParse(productData.compatibilities),
            bulkPricing: safeParse(productData.bulkPricing),
            status: 'ACTIVE'
        }).returning();

        res.status(201).json(newProduct[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getPaginatedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const categoryId = req.query.categoryId as string;

        const conditions = [];

        if (status) {
            conditions.push(eq(products.status, status as any));
        } else {
            conditions.push(ne(products.status, 'DELETED'));
        }

        if (categoryId) conditions.push(eq(products.categoryId, categoryId));

        if (search) {
            conditions.push(
                or(
                    ilike(products.name, `%${search}%`),
                    ilike(products.sku, `%${search}%`),
                    ilike(products.hsnCode, `%${search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db.select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            basePrice: products.basePrice,
            stock: products.stock,
            status: products.status,
            categoryName: categories.name,
            createdAt: products.createdAt,
            images: products.images,
            averageRating: products.averageRating,
            reviewCount: products.reviewCount
        })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(products.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(products)
            .where(whereClause);

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
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await db.select().from(products).where(eq(products.id, id));

        if (result.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        const dealerCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(dealerAuthorizedProducts)
            .where(eq(dealerAuthorizedProducts.productId, id));

        res.status(200).json({
            ...result[0],
            authorizedDealerCount: dealerCountQuery[0].count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateProductBaseDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body; 

        delete updates.compatibilities;

        const targetProduct = await db.select().from(products).where(eq(products.id, id));
        if (targetProduct.length === 0 || targetProduct[0].status === 'DELETED') {
            res.status(404).json({ message: 'Product not found or deleted' });
            return;
        }

        updates.updatedAt = new Date();
        const updatedProduct = await db.update(products).set(updates).where(eq(products.id, id)).returning();

        res.status(200).json(updatedProduct[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateProductCompatibilities = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { compatibilities } = req.body;

        const targetProduct = await db.select().from(products).where(eq(products.id, id));
        if (targetProduct.length === 0 || targetProduct[0].status === 'DELETED') {
            res.status(404).json({ message: 'Product not found or deleted' });
            return;
        }

        const updatedProduct = await db.update(products).set({
            compatibilities,
            updatedAt: new Date()
        }).where(eq(products.id, id)).returning();

        res.status(200).json({
            message: 'Product compatibility matrix updated successfully.',
            data: updatedProduct[0]
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateProductStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'DISABLED', 'ARCHIVED', 'DELETED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status transition' });
            return;
        }

        const updateData: any = { status, updatedAt: new Date() };
        if (status === 'DELETED') updateData.deletedAt = new Date();
        else updateData.deletedAt = null;

        const updatedProduct = await db.update(products).set(updateData).where(eq(products.id, id)).returning();

        if (updatedProduct.length === 0) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        res.status(200).json(updatedProduct[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const hardDeleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const linkedOrders = await db.select({ count: sql<number>`count(*)::int` })
            .from(orderItems)
            .where(eq(orderItems.productId, id));

        if (linkedOrders[0].count > 0) {
            res.status(409).json({
                message: 'Conflict: Cannot hard delete product. It is referenced in historical orders. Please use ARCHIVED status instead.',
                impactCount: linkedOrders[0].count
            });
            return;
        }

        await db.delete(dealerAuthorizedProducts).where(eq(dealerAuthorizedProducts.productId, id));
        await db.delete(productReviews).where(eq(productReviews.productId, id));
        await db.delete(products).where(eq(products.id, id));

        res.status(200).json({ message: 'Product, reviews, and dealer authorizations permanently hard deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const results = await db.select({
            id: productReviews.id,
            rating: productReviews.rating,
            comment: productReviews.comment,
            status: productReviews.status,
            createdAt: productReviews.createdAt,
            userEmail: users.email
        })
            .from(productReviews)
            .innerJoin(users, eq(productReviews.userId, users.id))
            .where(eq(productReviews.productId, id))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(productReviews.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(productReviews)
            .where(eq(productReviews.productId, id));

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
        res.status(500).json({ message: 'Server error', error });
    }
};

export const toggleProductReviewStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;

        const updated = await db.update(productReviews)
            .set({ status, updatedAt: new Date() })
            .where(eq(productReviews.id, reviewId))
            .returning();

        res.status(200).json({ message: `Review status updated to ${status}`, data: updated[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};