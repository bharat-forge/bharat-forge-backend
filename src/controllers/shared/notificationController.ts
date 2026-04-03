import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { db } from '../../configs/db';
import { notifications } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const getPaginatedNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Filters: 'unread', 'read', 'archived', or 'all_active' (default)
        const filter = req.query.filter as string;

        const conditions = [eq(notifications.userId, userId)];

        if (filter === 'archived') {
            conditions.push(eq(notifications.isArchived, true));
        } else {
            conditions.push(eq(notifications.isArchived, false));
            if (filter === 'unread') conditions.push(eq(notifications.isRead, false));
            if (filter === 'read') conditions.push(eq(notifications.isRead, true));
        }

        const whereClause = and(...conditions);

        const results = await db.select()
            .from(notifications)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(notifications.createdAt));

        const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(notifications)
            .where(whereClause);

        const totalCount = totalCountQuery[0].count;

        // Fast metric: Get the total number of unread, active notifications for the UI Badge
        const unreadCountQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(notifications)
            .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false), eq(notifications.isArchived, false)));

        res.status(200).json({
            data: results,
            meta: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit,
                unreadBadgeCount: unreadCountQuery[0].count
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getNotificationById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await db.select()
            .from(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

        if (notification.length === 0) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.status(200).json(notification[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const markAsSeen = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const updated = await db.update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
            .returning();

        if (updated.length === 0) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.status(200).json({ message: 'Notification marked as read', data: updated[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const markAllAsSeen = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;

        // Only update active, unread notifications
        await db.update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false), eq(notifications.isArchived, false)));

        res.status(200).json({ message: 'All active notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const archiveNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const updated = await db.update(notifications)
            .set({ isArchived: true, isRead: true }) // Automatically mark as read if archived
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
            .returning();

        if (updated.length === 0) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.status(200).json({ message: 'Notification archived successfully', data: updated[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const deleted = await db.delete(notifications)
            .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
            .returning();

        if (deleted.length === 0) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.status(200).json({ message: 'Notification permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};