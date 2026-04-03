import { Response } from 'express';
import { db } from '../../configs/db';
import { articleComments, articleVotes, articles } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { validateTextContent } from '../../utils/contentModeration';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { articleId, comment } = req.body;
        const userId = req.user.id;

        if (!comment || !comment.trim()) {
            res.status(400).json({ message: 'Comment content is required' });
            return;
        }

        validateTextContent(comment);

        const newComment = await db.insert(articleComments).values({
            articleId, 
            userId, 
            comment,
            status: 'ACTIVE'
        }).returning();

        res.status(201).json(newComment[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const { comment } = req.body;
        const userId = req.user.id;

        validateTextContent(comment);

        const target = await db.select().from(articleComments).where(and(eq(articleComments.id, commentId), eq(articleComments.userId, userId)));

        if (target.length === 0) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        const updated = await db.update(articleComments)
            .set({ comment, updatedAt: new Date() })
            .where(eq(articleComments.id, commentId))
            .returning();

        res.status(200).json(updated[0]);
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Server error' });
    }
};

export const deleteMyComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const target = await db.select().from(articleComments).where(and(eq(articleComments.id, commentId), eq(articleComments.userId, userId)));

        if (target.length === 0) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        await db.delete(articleComments).where(eq(articleComments.id, commentId));

        res.status(200).json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const castVote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { articleId, voteType } = req.body;
        const userId = req.user.id;

        const validTypes = ['LIKE', 'DISLIKE'];
        if (!validTypes.includes(voteType)) {
            res.status(400).json({ message: 'Invalid vote type' });
            return;
        }

        const existingVote = await db.select().from(articleVotes).where(and(eq(articleVotes.articleId, articleId), eq(articleVotes.userId, userId)));

        await db.transaction(async (tx) => {
            if (existingVote.length > 0) {
                const oldType = existingVote[0].type;
                if (oldType === voteType) return;

                await tx.update(articleVotes).set({ type: voteType as any }).where(and(eq(articleVotes.articleId, articleId), eq(articleVotes.userId, userId)));

                if (voteType === 'LIKE') {
                    await tx.update(articles).set({ 
                        likesCount: sql`${articles.likesCount} + 1`, 
                        dislikesCount: sql`${articles.dislikesCount} - 1` 
                    }).where(eq(articles.id, articleId));
                } else {
                    await tx.update(articles).set({ 
                        likesCount: sql`${articles.likesCount} - 1`, 
                        dislikesCount: sql`${articles.dislikesCount} + 1` 
                    }).where(eq(articles.id, articleId));
                }
            } else {
                await tx.insert(articleVotes).values({ articleId, userId, type: voteType as any });
                if (voteType === 'LIKE') {
                    await tx.update(articles).set({ likesCount: sql`${articles.likesCount} + 1` }).where(eq(articles.id, articleId));
                } else {
                    await tx.update(articles).set({ dislikesCount: sql`${articles.dislikesCount} + 1` }).where(eq(articles.id, articleId));
                }
            }
        });

        res.status(200).json({ message: 'Vote recorded' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};