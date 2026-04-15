import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { privacyPolicies } from '../../db/schema/privacy/privacy.schema';
import { eq } from 'drizzle-orm';

export const getActivePolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    const activePolicy = await db.select()
      .from(privacyPolicies)
      .where(eq(privacyPolicies.isActive, true))
      .limit(1);

    if (activePolicy.length === 0) {
      res.status(404).json({ message: 'No active privacy policy found' });
      return;
    }

    res.status(200).json(activePolicy[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};