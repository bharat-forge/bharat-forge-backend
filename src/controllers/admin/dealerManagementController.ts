import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { dealerProfiles, verificationBlueprints, dealerSubmissions, notifications, users } from '../../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { dealerInventory, dealerManualSales, products } from '../../db/schema';

export const createVerificationBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, type, isRequired } = req.body;

        const validTypes = ['FILE', 'TEXT', 'NUMBER'];
        if (!validTypes.includes(type)) {
            res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
            return;
        }

        const newBlueprint = await db.insert(verificationBlueprints).values({ name, description, type, isRequired }).returning();
        res.status(201).json(newBlueprint[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getVerificationBlueprints = async (req: Request, res: Response): Promise<void> => {
    try {
        const blueprints = await db.select().from(verificationBlueprints).orderBy(desc(verificationBlueprints.createdAt));
        res.status(200).json(blueprints);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getPaginatedDealers = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status as string;

        const whereClause = status ? eq(dealerProfiles.status, status as any) : undefined;

        const results = await db.select({
            id: dealerProfiles.id,
            userId: dealerProfiles.userId,
            businessName: dealerProfiles.businessName,
            contactPerson: dealerProfiles.contactPerson,
            status: dealerProfiles.status,
            email: users.email,
            createdAt: dealerProfiles.createdAt
        })
            .from(dealerProfiles)
            .leftJoin(users, eq(dealerProfiles.userId, users.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(dealerProfiles.createdAt));

        const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(dealerProfiles)
            .where(whereClause);

        res.status(200).json({
            data: results,
            meta: {
                totalCount: totalQuery[0].count,
                totalPages: Math.ceil(totalQuery[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getDealerComplianceDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dealerId } = req.params as { dealerId: string };

        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.id, dealerId));
        if (!dealer.length) {
            res.status(404).json({ message: 'Dealer not found' });
            return;
        }

        const complianceData = await db.select({
            blueprintId: verificationBlueprints.id,
            name: verificationBlueprints.name,
            type: verificationBlueprints.type,
            isRequired: verificationBlueprints.isRequired,
            submissionId: dealerSubmissions.id,
            submittedValue: dealerSubmissions.submittedValue,
            status: dealerSubmissions.status,
            adminRemarks: dealerSubmissions.adminRemarks,
            submittedAt: dealerSubmissions.submittedAt
        })
            .from(verificationBlueprints)
            .leftJoin(dealerSubmissions, and(
                eq(verificationBlueprints.id, dealerSubmissions.blueprintId),
                eq(dealerSubmissions.dealerId, dealerId)
            ))
            .where(eq(verificationBlueprints.status, 'ACTIVE'));

        res.status(200).json({
            dealer: dealer[0],
            complianceRequirements: complianceData
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

const checkAndAutoApproveDealer = async (dealerId: string, userId: string) => {
    const requiredBlueprints = await db.select().from(verificationBlueprints)
        .where(and(eq(verificationBlueprints.status, 'ACTIVE'), eq(verificationBlueprints.isRequired, true)));

    const approvedSubmissions = await db.select().from(dealerSubmissions)
        .where(and(eq(dealerSubmissions.dealerId, dealerId), eq(dealerSubmissions.status, 'APPROVED')));

    const requiredIds = requiredBlueprints.map(bp => bp.id);
    const approvedBlueprintIds = approvedSubmissions.map(sub => sub.blueprintId);
    const isFullyCompliant = requiredIds.every(id => approvedBlueprintIds.includes(id));

    if (isFullyCompliant) {
        await db.update(dealerProfiles).set({ status: 'APPROVED' }).where(eq(dealerProfiles.id, dealerId));
        await db.insert(notifications).values({
            userId,
            title: 'Dealership Approved',
            message: 'All your documents have been verified. Your dealer account is now fully active.'
        });
    }
};

export const reviewDealerSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
        const { submissionId } = req.params as { submissionId: string };
        const { status, adminRemarks } = req.body;

        const targetSubmission = await db.select().from(dealerSubmissions).where(eq(dealerSubmissions.id, submissionId));
        if (!targetSubmission.length) {
            res.status(404).json({ message: 'Submission not found' });
            return;
        }

        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.id, targetSubmission[0].dealerId));

        await db.update(dealerSubmissions)
            .set({ status, adminRemarks, updatedAt: new Date() })
            .where(eq(dealerSubmissions.id, submissionId));

        const blueprint = await db.select().from(verificationBlueprints).where(eq(verificationBlueprints.id, targetSubmission[0].blueprintId));

        await db.insert(notifications).values({
            userId: dealer[0].userId,
            title: `Document ${status}`,
            message: `Your submission for ${blueprint[0].name} was ${status}. ${adminRemarks ? 'Remarks: ' + adminRemarks : ''}`
        });

        if (status === 'APPROVED') {
            await checkAndAutoApproveDealer(dealer[0].id, dealer[0].userId);
        } else {
            if (dealer[0].status === 'APPROVED' && blueprint[0].isRequired) {
                await db.update(dealerProfiles).set({ status: 'PENDING' }).where(eq(dealerProfiles.id, dealer[0].id));
            }
        }

        res.status(200).json({ message: `Submission marked as ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateDealerSuspensionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dealerId } = req.params as { dealerId: string };
        const { status, reason } = req.body;

        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED_FULL', 'SUSPENDED_PURCHASES'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status type' });
            return;
        }

        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.id, dealerId));
        if (!dealer.length) {
            res.status(404).json({ message: 'Dealer not found' });
            return;
        }

        await db.update(dealerProfiles)
            .set({ status, updatedAt: new Date() })
            .where(eq(dealerProfiles.id, dealerId));

        let title = 'Account Status Update';
        let message = `Your account status has been updated to ${status}. ${reason ? 'Reason: ' + reason : ''}`;

        if (status === 'SUSPENDED_FULL') {
            message = `Your account has been fully suspended. You can no longer log in. Reason: ${reason}`;
        } else if (status === 'SUSPENDED_PURCHASES') {
            message = `Your purchasing privileges have been suspended. You can access past invoices but cannot place new orders. Reason: ${reason}`;
        } else if (status === 'APPROVED') {
            message = 'Your account has been approved. Full privileges restored.';
        } else if (status === 'REJECTED') {
            message = `Your account application has been rejected. Reason: ${reason}`;
        }

        await db.insert(notifications).values({
            userId: dealer[0].userId,
            title,
            message
        });

        res.status(200).json({ message: `Dealer status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getVerificationBlueprintById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const blueprint = await db.select().from(verificationBlueprints).where(eq(verificationBlueprints.id, id));

        if (blueprint.length === 0) {
            res.status(404).json({ message: 'Verification blueprint not found' });
            return;
        }

        res.status(200).json(blueprint[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const updateVerificationBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { name, description, type, isRequired } = req.body;

        const validTypes = ['FILE', 'TEXT', 'NUMBER'];
        if (!validTypes.includes(type)) {
            res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
            return;
        }

        const existingBlueprint = await db.select().from(verificationBlueprints).where(eq(verificationBlueprints.id, id));

        if (existingBlueprint.length === 0) {
            res.status(404).json({ message: 'Verification blueprint not found' });
            return;
        }

        const updatedBlueprint = await db.update(verificationBlueprints)
            .set({ name, description, type, isRequired, updatedAt: new Date() })
            .where(eq(verificationBlueprints.id, id))
            .returning();

        res.status(200).json(updatedBlueprint[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const toggleBlueprintStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'DISABLED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Invalid status. Must be ACTIVE or DISABLED' });
            return;
        }

        const updatedBlueprint = await db.update(verificationBlueprints)
            .set({ status, updatedAt: new Date() })
            .where(eq(verificationBlueprints.id, id))
            .returning();

        if (updatedBlueprint.length === 0) {
            res.status(404).json({ message: 'Verification blueprint not found' });
            return;
        }

        res.status(200).json(updatedBlueprint[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const hardDeleteBlueprint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params as { id: string };

        const linkedSubmissions = await db.select({ count: sql<number>`count(*)::int` })
            .from(dealerSubmissions)
            .where(eq(dealerSubmissions.blueprintId, id));

        if (linkedSubmissions[0].count > 0) {
            res.status(409).json({
                message: 'Conflict: Cannot hard delete this blueprint because dealers have already submitted data for it. Please use the DISABLED status instead to preserve audit logs.',
                impactCount: linkedSubmissions[0].count
            });
            return;
        }

        await db.delete(verificationBlueprints).where(eq(verificationBlueprints.id, id));

        res.status(200).json({ message: 'Verification blueprint permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getAdminDealerInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dealerId } = req.params as { dealerId: string };
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const inventory = await db.select({
            id: dealerInventory.id,
            dealerId: dealerInventory.dealerId,
            productId: dealerInventory.productId,
            quantity: dealerInventory.quantity,
            lastRestockedAt: dealerInventory.lastRestockedAt,
            createdAt: dealerInventory.createdAt,
            updatedAt: dealerInventory.updatedAt,
            productName: products.name,
            productSku: products.sku,
            productImages: products.images
        })
            .from(dealerInventory)
            .leftJoin(products, eq(dealerInventory.productId, products.id))
            .where(eq(dealerInventory.dealerId, dealerId))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(dealerInventory.updatedAt));

        const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(dealerInventory)
            .where(eq(dealerInventory.dealerId, dealerId));

        res.status(200).json({
            data: inventory,
            meta: {
                totalCount: totalQuery[0].count,
                totalPages: Math.ceil(totalQuery[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const getAdminDealerSalesHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { dealerId } = req.params as { dealerId: string };
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const sales = await db.select({
            id: dealerManualSales.id,
            dealerId: dealerManualSales.dealerId,
            productId: dealerManualSales.productId,
            quantitySold: dealerManualSales.quantitySold,
            salePrice: dealerManualSales.salePrice,
            customerName: dealerManualSales.customerName,
            customerPhone: dealerManualSales.customerPhone,
            invoiceReference: dealerManualSales.invoiceReference,
            saleDate: dealerManualSales.saleDate,
            createdAt: dealerManualSales.createdAt,
            productName: products.name,
            productSku: products.sku,
            productImages: products.images
        })
            .from(dealerManualSales)
            .leftJoin(products, eq(dealerManualSales.productId, products.id))
            .where(eq(dealerManualSales.dealerId, dealerId))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(dealerManualSales.saleDate));

        const totalQuery = await db.select({ count: sql<number>`count(*)::int` })
            .from(dealerManualSales)
            .where(eq(dealerManualSales.dealerId, dealerId));

        res.status(200).json({
            data: sales,
            meta: {
                totalCount: totalQuery[0].count,
                totalPages: Math.ceil(totalQuery[0].count / limit),
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};