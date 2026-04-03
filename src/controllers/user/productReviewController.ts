import { Response } from 'express';
import { db } from '../../configs/db';
import { productReviews, orderItems, orders } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { validateTextContent } from '../../utils/contentModeration';
import { recalculateProductRating } from '../../utils/ratingCalculator';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user.id;

        if (rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }

        if (comment) validateTextContent(comment);

        const hasPurchased = await db.select()
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(and(eq(orderItems.productId, productId), eq(orders.userId, userId), eq(orders.status, 'DELIVERED')));

        if (hasPurchased.length === 0) {
            res.status(403).json({ message: 'You can only review products you have purchased and received.' });
            return;
        }

        const existingReview = await db.select().from(productReviews).where(and(eq(productReviews.productId, productId), eq(productReviews.userId, userId)));

        if (existingReview.length > 0) {
            await db.update(productReviews).set({ rating, comment, updatedAt: new Date() }).where(eq(productReviews.id, existingReview[0].id));
        } else {
            await db.insert(productReviews).values({ productId, userId, rating, comment });
        }

        await recalculateProductRating(productId);

        res.status(200).json({ message: 'Review submitted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const updateMyReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        if (rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }
        if (comment) validateTextContent(comment);

        const targetReview = await db.select().from(productReviews).where(and(eq(productReviews.id, reviewId), eq(productReviews.userId, userId)));

        if (targetReview.length === 0) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }

        await db.update(productReviews).set({ rating, comment, updatedAt: new Date() }).where(eq(productReviews.id, reviewId));
        await recalculateProductRating(targetReview[0].productId);

        res.status(200).json({ message: 'Review updated successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const deleteMyReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const targetReview = await db.select().from(productReviews).where(and(eq(productReviews.id, reviewId), eq(productReviews.userId, userId)));

        if (targetReview.length === 0) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }

        await db.delete(productReviews).where(eq(productReviews.id, reviewId));
        await recalculateProductRating(targetReview[0].productId);

        res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};