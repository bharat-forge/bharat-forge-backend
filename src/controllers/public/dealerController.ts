import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { dealerProfiles, users, dealerReviews } from '../../db/schema';
import { eq, and, or, ilike, desc } from 'drizzle-orm';

export const getActiveDealers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string;
    let conditions: any[] = [eq(dealerProfiles.status, 'APPROVED')];

    if (search) {
      conditions.push(
        or(
          ilike(dealerProfiles.city, `%${search}%`),
          ilike(dealerProfiles.pincode, `%${search}%`),
          ilike(dealerProfiles.state, `%${search}%`),
          ilike(dealerProfiles.businessName, `%${search}%`)
        )
      );
    }

    const dealers = await db.select({
      id: dealerProfiles.id,
      businessName: dealerProfiles.businessName,
      contactPerson: dealerProfiles.contactPerson,
      phone: dealerProfiles.phone,
      street: dealerProfiles.street,
      city: dealerProfiles.city,
      state: dealerProfiles.state,
      pincode: dealerProfiles.pincode,
      averageRating: dealerProfiles.averageRating,
      reviewCount: dealerProfiles.reviewCount,
      email: users.email
    })
    .from(dealerProfiles)
    .innerJoin(users, eq(dealerProfiles.userId, users.id))
    .where(and(...conditions));

    res.status(200).json(dealers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDealerDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Fetch Dealer Info
    const dealer = await db.select({
      id: dealerProfiles.id,
      userId: dealerProfiles.userId,
      businessName: dealerProfiles.businessName,
      contactPerson: dealerProfiles.contactPerson,
      phone: dealerProfiles.phone,
      street: dealerProfiles.street,
      city: dealerProfiles.city,
      state: dealerProfiles.state,
      pincode: dealerProfiles.pincode,
      averageRating: dealerProfiles.averageRating,
      reviewCount: dealerProfiles.reviewCount,
      email: users.email,
      createdAt: dealerProfiles.createdAt
    })
    .from(dealerProfiles)
    .innerJoin(users, eq(dealerProfiles.userId, users.id))
    .where(and(eq(dealerProfiles.id, id), eq(dealerProfiles.status, 'APPROVED')));

    if (dealer.length === 0) {
      res.status(404).json({ message: 'Dealer not found or not active' });
      return;
    }

    // 2. Fetch Dealer Reviews
    const reviews = await db.select({
      id: dealerReviews.id,
      rating: dealerReviews.rating,
      comment: dealerReviews.comment,
      createdAt: dealerReviews.createdAt,
      userEmail: users.email
    })
    .from(dealerReviews)
    .leftJoin(users, eq(dealerReviews.userId, users.id))
    .where(eq(dealerReviews.dealerId, id))
    .orderBy(desc(dealerReviews.createdAt));

    // 3. Combine and Return
    res.status(200).json({
      ...dealer[0],
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};