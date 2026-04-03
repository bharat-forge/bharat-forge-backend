import { Response } from 'express';
import { db } from '../../configs/db';
import { orders, orderItems, products, invoices, notifications } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { users } from '../../db/schema';

export const getDetailedOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const conditions = [eq(orders.userId, userId)];
    if (status) conditions.push(eq(orders.status, status as any));
    const whereClause = and(...conditions);

    const baseOrders = await db.select()
      .from(orders)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(orders.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(whereClause);

    const populatedOrders = await Promise.all(baseOrders.map(async (order) => {
      const items = await db.select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        price: orderItems.price,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        images: products.images
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

      const invoice = await db.select().from(invoices).where(eq(invoices.orderId, order.id));

      return {
        ...order,
        items,
        invoice: invoice.length > 0 ? invoice[0] : null
      };
    }));

    res.status(200).json({
      data: populatedOrders,
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

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params as { [key: string]: string };

    const order = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
    if (order.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const items = await db.select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      price: orderItems.price,
      productId: products.id,
      productName: products.name,
      productSku: products.sku,
      images: products.images
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

    const invoice = await db.select().from(invoices).where(eq(invoices.orderId, orderId));

    res.status(200).json({
      ...order[0],
      items,
      invoice: invoice.length > 0 ? invoice[0] : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params as { [key: string]: string };
    const { reason } = req.body;

    const order = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
    if (order.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order[0].status)) {
      res.status(400).json({ message: `Cannot cancel order in ${order[0].status} state.` });
      return;
    }

    let nextRefundStatus: any = 'NONE';
    if (order[0].paymentStatus === 'COMPLETED') {
      nextRefundStatus = 'INITIATED';
    }

    const updated = await db.update(orders).set({
      status: 'CANCELLED',
      refundStatus: nextRefundStatus,
      cancellationReason: reason || null,
      cancelledAt: new Date(),
      updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning();

    if (nextRefundStatus === 'INITIATED') {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
      if (admins.length > 0) {
        await db.insert(notifications).values({
          userId: admins[0].id,
          title: 'Refund Initiated',
          message: `Order #${orderId.substring(0, 8)} was cancelled by user. Refund requires processing.`,
          metadata: { orderId }
        });
      }
    }

    res.status(200).json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};