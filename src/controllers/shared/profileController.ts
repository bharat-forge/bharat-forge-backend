import { Response } from 'express';
import { db } from '../../configs/db';
import { dealerProfiles, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { metadata, settings, firstName, lastName, mobileNumber, dob, gender, dealerData } = req.body;

    const currentUser = await db.select().from(users).where(eq(users.id, userId));
    
    if (!currentUser.length) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    const existingMetadata = (currentUser[0].metadata as Record<string, any>) || {};
    const existingSettings = (currentUser[0].settings as Record<string, any>) || {};

    const legacyMetadataUpdates = {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(mobileNumber && { mobileNumber }),
        ...(dob && { dob }),
        ...(gender && { gender }),
    };

    const updatedMetadata = {
      ...existingMetadata,
      ...legacyMetadataUpdates,
      ...(metadata || {})
    };

    const updatedSettings = {
      ...existingSettings,
      ...(settings || {})
    };

    const updatedUser = await db.update(users)
      .set({ 
        metadata: updatedMetadata, 
        settings: updatedSettings,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();

    if (req.user.role === 'DEALER' && dealerData) {
        const existingDealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
        
        if (existingDealer.length === 0) {
            const contactPerson = `${updatedMetadata.firstName || ''} ${updatedMetadata.lastName || ''}`.trim();
            const phone = updatedMetadata.mobileNumber || '';
            
            await db.insert(dealerProfiles).values({
                userId: userId,
                businessName: dealerData.businessName,
                gstNumber: dealerData.gstNumber,
                contactPerson: contactPerson,
                phone: phone,
                street: dealerData.street,
                city: dealerData.city,
                state: dealerData.state,
                pincode: dealerData.pincode,
                status: 'PENDING'
            });
        }
    }

    res.status(200).json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const user = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user.length) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    res.status(200).json(user[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};