import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { dealerAuthorizedProducts, products, dealerProfiles, notifications } from '../../db/schema';
import { eq, and, or, sql, desc, ilike } from 'drizzle-orm';

export const getAllDealershipRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const conditions = [];

    if (status) {
      conditions.push(eq(dealerAuthorizedProducts.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(dealerProfiles.businessName, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select({
      dealerId: dealerProfiles.id,
      businessName: dealerProfiles.businessName,
      productId: products.id,
      productName: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      status: dealerAuthorizedProducts.status,
      discountPercentage: dealerAuthorizedProducts.discountPercentage,
      requestedAt: dealerAuthorizedProducts.requestedAt
    })
    .from(dealerAuthorizedProducts)
    .innerJoin(dealerProfiles, eq(dealerAuthorizedProducts.dealerId, dealerProfiles.id))
    .innerJoin(products, eq(dealerAuthorizedProducts.productId, products.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(dealerAuthorizedProducts.requestedAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(dealerAuthorizedProducts)
      .innerJoin(dealerProfiles, eq(dealerAuthorizedProducts.dealerId, dealerProfiles.id))
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

export const updateDealershipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dealerId, productId } = req.params as { dealerId: string, productId: string };
    const { status, discountPercentage = 0 } = req.body; 

    const validStatuses = ['APPROVED', 'REJECTED', 'REVOKED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const request = await db.select().from(dealerAuthorizedProducts).where(
      and(eq(dealerAuthorizedProducts.dealerId, dealerId), eq(dealerAuthorizedProducts.productId, productId))
    );

    if (request.length === 0) {
      res.status(404).json({ message: 'Dealership request not found' });
      return;
    }

    await db.update(dealerAuthorizedProducts)
      .set({ 
        status: status as any, 
        discountPercentage: Number(discountPercentage),
        resolvedAt: new Date() 
      })
      .where(and(eq(dealerAuthorizedProducts.dealerId, dealerId), eq(dealerAuthorizedProducts.productId, productId)));

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.id, dealerId));
    const product = await db.select().from(products).where(eq(products.id, productId));

    let notificationMessage = `Your request for SKU: ${product[0].sku} has been ${status.toLowerCase()}.`;
    if (status === 'APPROVED') {
      notificationMessage += ` Your negotiated discount is ${discountPercentage}%.`;
    }

    await db.insert(notifications).values({
      userId: dealer[0].userId,
      title: `Product Dealership ${status}`,
      message: notificationMessage
    });

    res.status(200).json({ message: `Dealership status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};