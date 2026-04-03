import { Response } from 'express';
import { db } from '../../configs/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, mobileNumber, dob, gender } = req.body;

    const currentUser = await db.select().from(users).where(eq(users.id, userId));
    
    let existingMetadata = currentUser[0].metadata as Record<string, any> || {};

    const updatedMetadata = {
      ...existingMetadata,
      firstName: firstName || existingMetadata.firstName,
      lastName: lastName || existingMetadata.lastName,
      mobileNumber: mobileNumber || existingMetadata.mobileNumber,
      dob: dob || existingMetadata.dob,
      gender: gender || existingMetadata.gender
    };

    const updatedUser = await db.update(users)
      .set({ metadata: updatedMetadata, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const user = await db.select().from(users).where(eq(users.id, userId));
    res.status(200).json(user[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};