import { Response } from 'express';
import { db } from '../../configs/db';
import { dealerInventory, dealerManualSales, dealerProfiles, products } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

const getDealerProfileId = async (userId: string) => {
  const profile = await db.select({ id: dealerProfiles.id })
    .from(dealerProfiles)
    .where(eq(dealerProfiles.userId, userId));
  return profile.length ? profile[0].id : null;
};

export const getMyInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dealerId = await getDealerProfileId(req.user.id);
    if (!dealerId) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const inventory = await db.select({
      id: dealerInventory.id,
      dealerId: dealerInventory.dealerId,
      productId: dealerInventory.productId,
      quantity: dealerInventory.quantity,
      lastRestockedAt: dealerInventory.lastRestockedAt,
      createdAt: dealerInventory.createdAt,
      updatedAt: dealerInventory.updatedAt,
      productName: products.name,
      productSku: products.sku,
      productImages: products.images
    })
      .from(dealerInventory)
      .leftJoin(products, eq(dealerInventory.productId, products.id))
      .where(eq(dealerInventory.dealerId, dealerId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(dealerInventory.updatedAt));

    const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(dealerInventory)
      .where(eq(dealerInventory.dealerId, dealerId));

    res.status(200).json({
      data: inventory,
      meta: {
        totalCount: totalQuery[0].count,
        totalPages: Math.ceil(totalQuery[0].count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const logManualSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dealerId = await getDealerProfileId(req.user.id);
    if (!dealerId) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const { productId, quantitySold, salePrice, customerName, customerPhone, invoiceReference } = req.body;

    const stockCheck = await db.select()
      .from(dealerInventory)
      .where(and(
        eq(dealerInventory.dealerId, dealerId),
        eq(dealerInventory.productId, productId)
      ));

    if (!stockCheck.length || stockCheck[0].quantity < quantitySold) {
      res.status(400).json({ message: 'Insufficient inventory to log this sale' });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.insert(dealerManualSales).values({
        dealerId,
        productId,
        quantitySold,
        salePrice,
        customerName,
        customerPhone,
        invoiceReference
      });

      await tx.update(dealerInventory)
        .set({ 
          quantity: sql`${dealerInventory.quantity} - ${quantitySold}`,
          updatedAt: new Date()
        })
        .where(eq(dealerInventory.id, stockCheck[0].id));
    });

    res.status(201).json({ message: 'Sale logged and inventory updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getMySalesHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dealerId = await getDealerProfileId(req.user.id);
    if (!dealerId) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const sales = await db.select({
      id: dealerManualSales.id,
      dealerId: dealerManualSales.dealerId,
      productId: dealerManualSales.productId,
      quantitySold: dealerManualSales.quantitySold,
      salePrice: dealerManualSales.salePrice,
      customerName: dealerManualSales.customerName,
      customerPhone: dealerManualSales.customerPhone,
      invoiceReference: dealerManualSales.invoiceReference,
      saleDate: dealerManualSales.saleDate,
      createdAt: dealerManualSales.createdAt,
      productName: products.name,
      productSku: products.sku,
      productImages: products.images
    })
      .from(dealerManualSales)
      .leftJoin(products, eq(dealerManualSales.productId, products.id))
      .where(eq(dealerManualSales.dealerId, dealerId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(dealerManualSales.saleDate));

    const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(dealerManualSales)
      .where(eq(dealerManualSales.dealerId, dealerId));

    res.status(200).json({
      data: sales,
      meta: {
        totalCount: totalQuery[0].count,
        totalPages: Math.ceil(totalQuery[0].count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};