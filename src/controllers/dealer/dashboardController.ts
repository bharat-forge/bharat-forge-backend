import { Response } from 'express';
import { db } from '../../configs/db';
import { orders, supportTickets, dealerAuthorizedProducts, dealerProfiles, products, orderItems, categories } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getDealerDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    
    const dealerProfile = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId)).limit(1);
    if (dealerProfile.length === 0) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }
    const dealerId = dealerProfile[0].id;

    const totalOrdersResult = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.userId, userId));
    const openTicketsResult = await db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(and(eq(supportTickets.creatorId, userId), eq(supportTickets.status, 'OPEN')));
    const authorizedProductsResult = await db.select({ count: sql<number>`count(*)::int` }).from(dealerAuthorizedProducts).where(and(eq(dealerAuthorizedProducts.dealerId, dealerId), eq(dealerAuthorizedProducts.status, 'APPROVED')));
    const totalSpentResult = await db.select({ total: sql<number>`sum(${orders.totalAmount})::float` }).from(orders).where(and(eq(orders.userId, userId), eq(orders.paymentStatus, 'COMPLETED')));

    const myOrders = await db.select({ amount: orders.totalAmount, createdAt: orders.createdAt, status: orders.status }).from(orders).where(eq(orders.userId, userId));

    const statusMap: Record<string, number> = {};
    myOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const orderStatusDistribution = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] }));

    const monthlySpendMap: Record<string, number> = {};
    const monthlyOrderVolMap: Record<string, number> = {};
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlySpendMap[key] = 0;
      monthlyOrderVolMap[key] = 0;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    myOrders.forEach(order => {
      const d = new Date(order.createdAt);
      if (d >= sixMonthsAgo) {
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (monthlySpendMap[key] !== undefined) {
          monthlySpendMap[key] += Number(order.amount);
          monthlyOrderVolMap[key] += 1;
        }
      }
    });

    const spendTrend = Object.keys(monthlySpendMap).map(name => ({ name, total: monthlySpendMap[name], volume: monthlyOrderVolMap[name] }));

    const orderItemsWithCategory = await db.select({
      total: sql<number>`(${orderItems.price} * ${orderItems.quantity})::float`,
      categoryName: categories.name
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(orders.paymentStatus, 'COMPLETED'), eq(orders.userId, userId)));

    const categorySpendMap: Record<string, number> = {};
    orderItemsWithCategory.forEach(item => {
      categorySpendMap[item.categoryName] = (categorySpendMap[item.categoryName] || 0) + item.total;
    });
    const spendByCategory = Object.keys(categorySpendMap).map(name => ({ name, total: categorySpendMap[name] }));

    const totalSpent = totalSpentResult[0].total || 0;
    const orderCount = totalOrdersResult[0].count || 1;
    const avgOrderValue = totalSpent / orderCount;

    res.status(200).json({
      metrics: {
        totalSpent,
        totalOrders: orderCount,
        authorizedProducts: authorizedProductsResult[0].count || 0,
        openTickets: openTicketsResult[0].count || 0,
        avgOrderValue
      },
      charts: {
        spendTrend,
        orderStatusDistribution,
        spendByCategory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving dashboard stats' });
  }
};