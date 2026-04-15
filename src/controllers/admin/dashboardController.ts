import { Response } from 'express';
import { db } from '../../configs/db';
import { orders, supportTickets, dealerProfiles, products, orderItems, categories } from '../../db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getAdminDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalOrdersResult = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
    const totalDealersResult = await db.select({ count: sql<number>`count(*)::int` }).from(dealerProfiles).where(eq(dealerProfiles.status, 'APPROVED'));
    const totalProductsResult = await db.select({ count: sql<number>`count(*)::int` }).from(products);
    const openTicketsResult = await db.select({ count: sql<number>`count(*)::int` }).from(supportTickets).where(eq(supportTickets.status, 'OPEN'));
    const totalRevenueResult = await db.select({ total: sql<number>`sum(${orders.totalAmount})::float` }).from(orders).where(eq(orders.paymentStatus, 'COMPLETED'));

    const allOrders = await db.select({ amount: orders.totalAmount, createdAt: orders.createdAt, status: orders.status }).from(orders);
    const allDealers = await db.select({ createdAt: dealerProfiles.createdAt }).from(dealerProfiles);

    // 1. Order Status Distribution
    const statusMap: Record<string, number> = {};
    allOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const orderStatusDistribution = Object.keys(statusMap).map(k => ({ status: k, count: statusMap[k] }));

    // 2. 6-Month Revenue & Volume Trends
    const monthlyRevenueMap: Record<string, number> = {};
    const monthlyOrderVolMap: Record<string, number> = {};
    const dealerGrowthMap: Record<string, number> = {};
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyRevenueMap[key] = 0;
      monthlyOrderVolMap[key] = 0;
      dealerGrowthMap[key] = 0;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    allOrders.forEach(order => {
      const d = new Date(order.createdAt);
      if (d >= sixMonthsAgo) {
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (monthlyRevenueMap[key] !== undefined) {
          monthlyRevenueMap[key] += Number(order.amount);
          monthlyOrderVolMap[key] += 1;
        }
      }
    });

    allDealers.forEach(dealer => {
      const d = new Date(dealer.createdAt);
      if (d >= sixMonthsAgo) {
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (dealerGrowthMap[key] !== undefined) dealerGrowthMap[key] += 1;
      }
    });

    const revenueTrend = Object.keys(monthlyRevenueMap).map(name => ({ name, total: monthlyRevenueMap[name], volume: monthlyOrderVolMap[name] }));
    const dealerGrowthTrend = Object.keys(dealerGrowthMap).map(name => ({ name, newDealers: dealerGrowthMap[name] }));

    // 3. Revenue by Category
    const orderItemsWithCategory = await db.select({
      total: sql<number>`(${orderItems.price} * ${orderItems.quantity})::float`,
      categoryName: categories.name
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(orders.paymentStatus, 'COMPLETED'));

    const categoryRevMap: Record<string, number> = {};
    orderItemsWithCategory.forEach(item => {
      categoryRevMap[item.categoryName] = (categoryRevMap[item.categoryName] || 0) + item.total;
    });
    const revenueByCategory = Object.keys(categoryRevMap).map(name => ({ name, total: categoryRevMap[name] }));

    const totalRev = totalRevenueResult[0].total || 0;
    const orderCount = totalOrdersResult[0].count || 1;
    const avgOrderValue = totalRev / orderCount;

    res.status(200).json({
      metrics: {
        totalRevenue: totalRev,
        totalOrders: orderCount,
        activeDealers: totalDealersResult[0].count || 0,
        totalProducts: totalProductsResult[0].count || 0,
        openTickets: openTicketsResult[0].count || 0,
        avgOrderValue: avgOrderValue
      },
      charts: {
        revenueTrend,
        orderStatusDistribution,
        dealerGrowthTrend,
        revenueByCategory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving dashboard stats' });
  }
};