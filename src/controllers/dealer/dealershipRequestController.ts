import { Response } from 'express';
import { db } from '../../configs/db';
import { dealerAuthorizedProducts, products, dealerProfiles, notifications, users } from '../../db/schema';
import { eq, and, or, sql, desc, ilike } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const requestDealership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
    if (dealer.length === 0 || dealer[0].status !== 'APPROVED') {
      res.status(403).json({ message: 'Only fully approved dealers can request product dealership.' });
      return;
    }

    const product = await db.select().from(products).where(eq(products.id, productId));
    if (product.length === 0 || product[0].status !== 'ACTIVE') {
      res.status(404).json({ message: 'Product not found or inactive.' });
      return;
    }

    const existingRequest = await db.select().from(dealerAuthorizedProducts).where(
      and(eq(dealerAuthorizedProducts.dealerId, dealer[0].id), eq(dealerAuthorizedProducts.productId, productId))
    );

    if (existingRequest.length > 0) {
      res.status(400).json({ message: 'Dealership request already exists for this product.' });
      return;
    }

    const request = await db.insert(dealerAuthorizedProducts).values({
      dealerId: dealer[0].id,
      productId,
      status: 'PENDING'
    }).returning();

    const admins = await db.select().from(users).where(eq(users.role, 'ADMIN'));
    if (admins.length > 0) {
      await db.insert(notifications).values({
        userId: admins[0].id,
        title: 'New Dealership Request',
        message: `${dealer[0].businessName} requested dealership for product SKU: ${product[0].sku}`
      });
    }

    res.status(201).json(request[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyProductRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
    if (dealer.length === 0) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const conditions = [eq(dealerAuthorizedProducts.dealerId, dealer[0].id)];

    if (status) {
      conditions.push(eq(dealerAuthorizedProducts.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        ) as any
      );
    }

    const whereClause = and(...conditions);

    const results = await db.select({
      productId: products.id,
      name: products.name,
      sku: products.sku,
      status: dealerAuthorizedProducts.status,
      requestedAt: dealerAuthorizedProducts.requestedAt,
      resolvedAt: dealerAuthorizedProducts.resolvedAt
    })
    .from(dealerAuthorizedProducts)
    .innerJoin(products, eq(dealerAuthorizedProducts.productId, products.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(dealerAuthorizedProducts.requestedAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(dealerAuthorizedProducts)
      .innerJoin(products, eq(dealerAuthorizedProducts.productId, products.id))
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
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelDealershipRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params as { productId: string };
    const userId = req.user.id;

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
    if (dealer.length === 0) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const request = await db.select().from(dealerAuthorizedProducts).where(
      and(eq(dealerAuthorizedProducts.dealerId, dealer[0].id), eq(dealerAuthorizedProducts.productId, productId))
    );

    if (request.length === 0 || request[0].status !== 'PENDING') {
      res.status(400).json({ message: 'Can only cancel pending requests.' });
      return;
    }

    await db.delete(dealerAuthorizedProducts).where(
      and(eq(dealerAuthorizedProducts.dealerId, dealer[0].id), eq(dealerAuthorizedProducts.productId, productId))
    );

    res.status(200).json({ message: 'Request cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};