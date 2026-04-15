import { Response } from 'express';
import { db } from '../../configs/db';
import { carts, cartItems, orders, orderItems, products, dealerProfiles } from '../../db/schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { createRazorpayOrder } from '../../services/razorpayService';
import crypto from 'crypto';

export const checkoutCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await db.select().from(carts).where(eq(carts.userId, userId));
    if (cart.length === 0) {
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }

    const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart[0].id));
    if (items.length === 0) {
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }

    let totalAmount = 0;
    for (const item of items) {
      const product = await db.select().from(products).where(eq(products.id, item.productId));
      if (product[0].stock < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for ${product[0].name}` });
        return;
      }
      totalAmount += item.price * item.quantity;
    }

    let dealerId = null;
    if (req.user.role === 'DEALER') {
      const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
      if (dealer.length > 0) dealerId = dealer[0].id;
    }

    const result = await db.transaction(async (tx) => {
      const newOrder = await tx.insert(orders).values({
        userId,
        dealerProfileId: dealerId,
        totalAmount,
        paymentMethod: 'razorpay',
        shippingStreet: shippingAddress.street,
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingPincode: shippingAddress.pincode,
        shippingCountry: shippingAddress.country || 'India',
      }).returning();

      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: newOrder[0].id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        });
      }

      const razorpayOrder = await createRazorpayOrder(totalAmount, newOrder[0].id);
      
      await tx.update(orders).set({ razorpayOrderId: razorpayOrder.id }).where(eq(orders.id, newOrder[0].id));

      return { order: newOrder[0], razorpayOrder };
    });

    res.status(201).json({ order: result.order, razorpayOrder: result.razorpayOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyRazorpayPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      await db.update(orders)
        .set({ 
          paymentStatus: 'COMPLETED',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          updatedAt: new Date()
        })
        .where(eq(orders.razorpayOrderId, razorpay_order_id));

      const cart = await db.select().from(carts).where(eq(carts.userId, userId));
      if (cart.length > 0) {
        await db.delete(cartItems).where(eq(cartItems.cartId, cart[0].id));
      }

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const conditions = [eq(orders.userId, userId)];

    if (status) {
      conditions.push(eq(orders.status, status as any));
    }

    if (search) {
      conditions.push(ilike(orders.id, `%${search}%`));
    }

    const whereClause = and(...conditions);

    const results = await db.select()
      .from(orders)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(orders.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
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