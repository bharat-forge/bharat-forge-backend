import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { products, categories, dealerAuthorizedProducts, dealerProfiles, productReviews, users } from '../../db/schema';
import { eq, ne, and, or, sql, desc, ilike, gte, lte } from 'drizzle-orm';

export const browseProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12; 
    const offset = (page - 1) * limit;
    
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const minRating = parseFloat(req.query.minRating as string);

    const conditions = [eq(products.status, 'ACTIVE')];

    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (!isNaN(minPrice)) conditions.push(gte(products.basePrice, minPrice));
    if (!isNaN(maxPrice)) conditions.push(lte(products.basePrice, maxPrice));
    if (!isNaN(minRating)) conditions.push(gte(products.averageRating, minRating));

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(categories.name, `%${search}%`)
        ) as any
      );
    }

    const whereClause = and(...conditions);

    const results = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      images: products.images,
      averageRating: sql<number>`(SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::float`,
      reviewCount: sql<number>`(SELECT count(*) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::int`,
      categoryName: categories.name,
      createdAt: products.createdAt
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(products.createdAt));

    const totalCountQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause);

    res.status(200).json({
      data: results,
      meta: {
        totalCount: totalCountQuery[0].count,
        totalPages: Math.ceil(totalCountQuery[0].count / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProductDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };

    const product = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      description: products.description,
      basePrice: products.basePrice,
      images: products.images,
      categoryId: products.categoryId, // Added this to easily fetch suggestions
      compatibilities: products.compatibilities,
      averageRating: sql<number>`(SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::float`,
      reviewCount: sql<number>`(SELECT count(*) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::int`,
      categoryName: categories.name
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, id), eq(products.status, 'ACTIVE')));
    
    if (product.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const authorizedDealers = await db.select({
      id: dealerProfiles.id,
      userId: dealerProfiles.userId,
      businessName: dealerProfiles.businessName,
      city: dealerProfiles.city,
      state: dealerProfiles.state,
      averageRating: dealerProfiles.averageRating
    })
    .from(dealerAuthorizedProducts)
    .innerJoin(dealerProfiles, eq(dealerAuthorizedProducts.dealerId, dealerProfiles.id))
    .where(and(eq(dealerAuthorizedProducts.productId, id), eq(dealerAuthorizedProducts.status, 'APPROVED')));

    const reviews = await db.select({
      id: productReviews.id,
      rating: productReviews.rating,
      comment: productReviews.comment,
      createdAt: productReviews.createdAt,
      userEmail: users.email
    })
    .from(productReviews)
    .leftJoin(users, eq(productReviews.userId, users.id))
    .where(and(eq(productReviews.productId, id), eq(productReviews.status, 'ACTIVE')))
    .orderBy(desc(productReviews.createdAt));

    res.status(200).json({
      ...product[0],
      authorizedDealers,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeCategories = await db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      searchBlueprint: categories.searchBlueprint 
    })
    .from(categories)
    .where(eq(categories.status, 'ACTIVE'))
    .orderBy(categories.name);

    res.status(200).json(activeCategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// NEW: Dedicated endpoint to fetch similar products based on the target product's category
export const getSimilarProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };

    // 1. Get the current product's category
    const targetProduct = await db.select({ categoryId: products.categoryId }).from(products).where(eq(products.id, id));

    if (targetProduct.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const targetCategoryId = targetProduct[0].categoryId;

    // 2. Fetch up to 4 active products in the same category, excluding the current product
    const similarProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      images: products.images,
      categoryName: categories.name,
      averageRating: sql<number>`(SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::float`,
      reviewCount: sql<number>`(SELECT count(*) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::int`
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(
      eq(products.categoryId, targetCategoryId),
      ne(products.id, id), // Exclude the product we are currently viewing
      eq(products.status, 'ACTIVE')
    ))
    .limit(4);

    res.status(200).json(similarProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};