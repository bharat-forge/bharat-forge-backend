import { Response } from 'express';
import { db } from '../../configs/db';
import { dealerProfiles, verificationBlueprints, dealerSubmissions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { uploadFileToS3 } from '../../services/uploadService';

export const getVerificationRequirements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
    if (!dealer.length) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const blueprints = await db.select().from(verificationBlueprints).where(eq(verificationBlueprints.status, 'ACTIVE'));
    const submissions = await db.select().from(dealerSubmissions).where(eq(dealerSubmissions.dealerId, dealer[0].id));

    const requirements = blueprints.map(bp => {
      const existingSubmission = submissions.find(sub => sub.blueprintId === bp.id);
      return {
        blueprint: bp,
        submission: existingSubmission || null
      };
    });

    // Calculate the overall document submission status for the frontend
    let overallDocsStatus = 'APPROVED'; // Innocent until proven guilty
    const requiredBlueprints = blueprints.filter(bp => bp.isRequired);
    
    let hasMissing = false;
    let hasRejected = false;
    let hasPending = false;

    for (const bp of requiredBlueprints) {
      const sub = submissions.find(s => s.blueprintId === bp.id);
      if (!sub) hasMissing = true;
      else if (sub.status === 'REJECTED') hasRejected = true;
      else if (sub.status === 'PENDING') hasPending = true;
    }

    if (hasRejected) overallDocsStatus = 'REJECTED'; // User must take action
    else if (hasMissing) overallDocsStatus = 'PENDING'; // User must take action
    else if (hasPending) overallDocsStatus = 'PENDING_REVIEW'; // User is waiting

    res.status(200).json({
      dealerStatus: dealer[0].status,
      overallDocsStatus,
      requirements
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitVerificationData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { blueprintId, textValue } = req.body;

    const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
    if (!dealer.length) {
      res.status(404).json({ message: 'Dealer profile not found' });
      return;
    }

    const blueprint = await db.select().from(verificationBlueprints).where(eq(verificationBlueprints.id, blueprintId));
    if (!blueprint.length || blueprint[0].status !== 'ACTIVE') {
      res.status(400).json({ message: 'Invalid or inactive verification requirement' });
      return;
    }

    const existingSubmission = await db.select().from(dealerSubmissions).where(
      and(eq(dealerSubmissions.dealerId, dealer[0].id), eq(dealerSubmissions.blueprintId, blueprintId))
    );

    if (existingSubmission.length > 0 && ['PENDING', 'APPROVED'].includes(existingSubmission[0].status)) {
      res.status(403).json({ message: 'Cannot edit a pending or approved submission' });
      return;
    }

    let submittedValue = textValue;

    if (blueprint[0].type === 'FILE') {
      if (!req.file) {
        res.status(400).json({ message: 'File is required for this verification type' });
        return;
      }
      submittedValue = await uploadFileToS3(req.file.buffer, req.file.originalname, req.file.mimetype, 'dealer-kyc');
    } else if (!submittedValue) {
      res.status(400).json({ message: 'Value is required' });
      return;
    }

    if (existingSubmission.length > 0) {
      await db.update(dealerSubmissions)
        .set({ submittedValue, status: 'PENDING', adminRemarks: null, updatedAt: new Date() })
        .where(eq(dealerSubmissions.id, existingSubmission[0].id));
    } else {
      await db.insert(dealerSubmissions).values({
        dealerId: dealer[0].id,
        blueprintId,
        submittedValue,
        status: 'PENDING'
      });
    }

    // If dealer was REJECTED previously, bump them back to PENDING to trigger a re-review
    if (dealer[0].status === 'REJECTED') {
      await db.update(dealerProfiles).set({ status: 'PENDING', updatedAt: new Date() }).where(eq(dealerProfiles.id, dealer[0].id));
    }

    res.status(200).json({ message: 'Submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};