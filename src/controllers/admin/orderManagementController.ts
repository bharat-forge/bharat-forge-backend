import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { orders, notifications, users, dealerProfiles, orderItems, dealerInventory } from '../../db/schema';
import { eq, and, or, sql, desc, ilike } from 'drizzle-orm';

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const refundStatus = req.query.refundStatus as string;
    const search = req.query.search as string;

    const conditions = [];

    if (status) conditions.push(eq(orders.status, status as any));
    if (paymentStatus) conditions.push(eq(orders.paymentStatus, paymentStatus as any));
    if (refundStatus) conditions.push(eq(orders.refundStatus, refundStatus as any));

    if (search) {
      conditions.push(
        or(
          ilike(orders.id, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(dealerProfiles.businessName, `%${search}%`)
        ) as any
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.select({
      id: orders.id,
      totalAmount: orders.totalAmount,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      refundStatus: orders.refundStatus,
      createdAt: orders.createdAt,
      userEmail: users.email,
      businessName: dealerProfiles.businessName
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(dealerProfiles, eq(orders.dealerProfileId, dealerProfiles.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(orders.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(dealerProfiles, eq(orders.dealerProfileId, dealerProfiles.id))
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

export const updateRefundStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params as { [key: string]: string };
    const { refundStatus } = req.body;

    const validStatuses = ['NONE', 'INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(refundStatus)) {
      res.status(400).json({ message: 'Invalid refund status' });
      return;
    }

    const order = await db.select().from(orders).where(eq(orders.id, orderId));
    if (order.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    await db.update(orders).set({ refundStatus, updatedAt: new Date() }).where(eq(orders.id, orderId));

    await db.insert(notifications).values({
      userId: order[0].userId,
      title: 'Refund Status Update',
      message: `The refund status for order #${orderId.substring(0, 8)} is now ${refundStatus}.`,
      metadata: { orderId }
    });

    res.status(200).json({ message: `Refund status updated to ${refundStatus}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params as { [key: string]: string };
    const { status } = req.body; 

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid order status' });
      return;
    }

    const order = await db.select().from(orders).where(eq(orders.id, orderId));
    if (order.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const currentStatus = order[0].status;
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'SHIPPED') updateData.shippedAt = new Date();
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();

    await db.transaction(async (tx) => {
      await tx.update(orders).set(updateData).where(eq(orders.id, orderId));

      if (status === 'DELIVERED' && currentStatus !== 'DELIVERED' && order[0].dealerProfileId) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

        for (const item of items) {
          const existingStock = await tx.select()
            .from(dealerInventory)
            .where(and(
              eq(dealerInventory.dealerId, order[0].dealerProfileId),
              eq(dealerInventory.productId, item.productId)
            ));

          if (existingStock.length > 0) {
            await tx.update(dealerInventory)
              .set({
                quantity: sql`${dealerInventory.quantity} + ${item.quantity}`,
                lastRestockedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(dealerInventory.id, existingStock[0].id));
          } else {
            await tx.insert(dealerInventory).values({
              dealerId: order[0].dealerProfileId,
              productId: item.productId,
              quantity: item.quantity,
              lastRestockedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

      await tx.insert(notifications).values({
        userId: order[0].userId,
        title: 'Order Status Update',
        message: `Your order #${orderId.substring(0, 8)} is now ${status}.`,
        metadata: { orderId }
      });
    });

    res.status(200).json({ message: `Order marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};