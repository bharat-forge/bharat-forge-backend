import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { categories, products, dealerAuthorizedProducts, dealerProfiles } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const getSearchBlueprints = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeCategories = await db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      searchBlueprint: categories.searchBlueprint
    })
    .from(categories)
    .where(and(eq(categories.status, 'ACTIVE'), sql`${categories.searchBlueprint} IS NOT NULL`));

    res.status(200).json(activeCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDynamicOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params as { [key: string]: string };
    const { currentSelections, nextField } = req.body;

    const selectionsJSON = currentSelections ? JSON.stringify(currentSelections) : '{}';

    const matchedProducts = await db.select({ compatibilities: products.compatibilities })
      .from(products)
      .where(and(
        eq(products.categoryId, categoryId),
        eq(products.status, 'ACTIVE'),
        sql`${products.compatibilities} @> ${selectionsJSON}::jsonb`
      ));

    const optionsSet = new Set<string | number>();
    for (const prod of matchedProducts) {
      if (prod.compatibilities && typeof prod.compatibilities === 'object') {
        const val = (prod.compatibilities as any)[nextField];
        if (val !== undefined && val !== null) {
          optionsSet.add(val);
        }
      }
    }

    res.status(200).json({ field: nextField, options: Array.from(optionsSet) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const findMatchingProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params as { [key: string]: string };
    const { selections } = req.body;

    const selectionsJSON = selections ? JSON.stringify(selections) : '{}';

    const matchedProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      images: products.images,
      averageRating: products.averageRating,
      reviewCount: products.reviewCount
    })
    .from(products)
    .where(and(
      eq(products.categoryId, categoryId),
      eq(products.status, 'ACTIVE'),
      sql`${products.compatibilities} @> ${selectionsJSON}::jsonb`
    ));

    const productsWithDealers = await Promise.all(matchedProducts.map(async (prod) => {
      const dealers = await db.select({
        id: dealerProfiles.id,
        businessName: dealerProfiles.businessName,
        city: dealerProfiles.city,
        state: dealerProfiles.state
      })
      .from(dealerAuthorizedProducts)
      .innerJoin(dealerProfiles, eq(dealerAuthorizedProducts.dealerId, dealerProfiles.id))
      .where(and(eq(dealerAuthorizedProducts.productId, prod.id), eq(dealerAuthorizedProducts.status, 'APPROVED')));

      return { ...prod, dealers };
    }));

    res.status(200).json(productsWithDealers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};