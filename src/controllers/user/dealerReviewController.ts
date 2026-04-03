import { Response } from 'express';
import { db } from '../../configs/db';
import { dealerReviews } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { validateTextContent } from '../../utils/contentModeration';
import { recalculateDealerRating } from '../../utils/ratingCalculator';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const submitDealerReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { dealerId, rating, comment } = req.body;
        const userId = req.user.id;

        if (rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }

        if (comment) validateTextContent(comment);

        const existingReview = await db.select().from(dealerReviews).where(and(eq(dealerReviews.dealerId, dealerId), eq(dealerReviews.userId, userId)));

        if (existingReview.length > 0) {
            await db.update(dealerReviews).set({ rating, comment, updatedAt: new Date() }).where(eq(dealerReviews.id, existingReview[0].id));
        } else {
            await db.insert(dealerReviews).values({ dealerId, userId, rating, comment });
        }

        await recalculateDealerRating(dealerId);

        res.status(200).json({ message: 'Review submitted successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const updateMyDealerReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        if (rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }
        if (comment) validateTextContent(comment);

        const targetReview = await db.select().from(dealerReviews).where(and(eq(dealerReviews.id, reviewId), eq(dealerReviews.userId, userId)));

        if (targetReview.length === 0) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }

        await db.update(dealerReviews).set({ rating, comment, updatedAt: new Date() }).where(eq(dealerReviews.id, reviewId));
        await recalculateDealerRating(targetReview[0].dealerId);

        res.status(200).json({ message: 'Review updated successfully' });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const deleteMyDealerReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const targetReview = await db.select().from(dealerReviews).where(and(eq(dealerReviews.id, reviewId), eq(dealerReviews.userId, userId)));

        if (targetReview.length === 0) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }

        await db.delete(dealerReviews).where(eq(dealerReviews.id, reviewId));
        await recalculateDealerRating(targetReview[0].dealerId);

        res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};