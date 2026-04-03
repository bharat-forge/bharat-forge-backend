import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { users, orders, notifications } from '../../db/schema';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';

export const getPaginatedUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const status = req.query.status as string;

        let conditions = [eq(users.role, 'USER')];

        if (status) {
            conditions.push(eq(users.status, status as any));
        }

        if (search) {
            conditions.push(ilike(users.email, `%${search}%`));
        }

        const whereClause = and(...conditions);

        const results = await db.select({
            id: users.id,
            email: users.email,
            status: users.status,
            createdAt: users.createdAt
        })
            .from(users)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(users.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(users)
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

export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const userResult = await db.select()
            .from(users)
            .where(and(eq(users.id, id), eq(users.role, 'USER')));

        if (userResult.length === 0) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }

        const stats = await db.select({
            orderCount: sql<number>`count(${orders.id})::int`,
            totalSpent: sql<number>`sum(${orders.totalAmount})::float`
        })
            .from(orders)
            .where(eq(orders.userId, id));

        res.status(200).json({
            user: userResult[0],
            stats: stats[0] || { orderCount: 0, totalSpent: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'SUSPENDED_PURCHASES', 'BLOCKED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }

        const updated = await db.update(users)
            .set({ status, updatedAt: new Date() })
            .where(and(eq(users.id, id), eq(users.role, 'USER')))
            .returning();

        if (updated.length === 0) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }

        await db.insert(notifications).values({
            userId: id,
            title: 'Account Status Updated',
            message: `Your account status has been changed to ${status.replace('_', ' ')}.`
        });

        res.status(200).json(updated[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const sendCustomNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, message, metadata } = req.body;

        const user = await db.select().from(users).where(eq(users.id, id));
        if (user.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        await db.insert(notifications).values({
            userId: id,
            title,
            message,
            metadata: metadata || {}
        });

        res.status(200).json({ message: 'Notification sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const sendBulkNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, message, metadata } = req.body;

        const customers = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, 'USER'), eq(users.status, 'ACTIVE')));

        if (customers.length === 0) {
            res.status(404).json({ message: 'No active customers found' });
            return;
        }

        const notificationPayload = customers.map(c => ({
            userId: c.id,
            title,
            message,
            metadata: metadata || {}
        }));

        await db.insert(notifications).values(notificationPayload);

        res.status(200).json({ message: `Notification sent to ${customers.length} customers` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const hardDeleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const orderCheck = await db.select({ count: sql<number>`count(*)::int` })
            .from(orders)
            .where(eq(orders.userId, id));

        if (orderCheck[0].count > 0) {
            res.status(409).json({ message: 'Cannot delete user with order history. Block the user instead.' });
            return;
        }

        await db.delete(notifications).where(eq(notifications.userId, id));
        const deleted = await db.delete(users)
            .where(and(eq(users.id, id), eq(users.role, 'USER')))
            .returning();

        if (deleted.length === 0) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }

        res.status(200).json({ message: 'Customer permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};