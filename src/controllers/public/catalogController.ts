import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../configs/db';
import { products, categories, dealerAuthorizedProducts, dealerProfiles, productReviews, users } from '../../db/schema';
import { eq, ne, and, or, sql, desc, ilike, gte, lte } from 'drizzle-orm';

const getUserFromToken = (req: Request) => {
  if ((req as any).user) return (req as any).user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET as string) as any;
    } catch (e) {
      return null;
    }
  }
  return null;
};

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

    let dealerId: string | null = null;
    const user = getUserFromToken(req);
    
    if (user && user.role === 'DEALER') {
        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, user.id));
        if (dealer.length > 0) dealerId = dealer[0].id;
    }

    const discountQuery = dealerId
        ? sql<number>`COALESCE((SELECT discount_percentage FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId} AND status = 'APPROVED'), 0)::float`
        : sql<number>`0::float`;

    const dealershipStatusQuery = dealerId
        ? sql<string>`(SELECT status FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId})`
        : sql<string>`null`;

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
      discountPercentage: discountQuery,
      dealershipStatus: dealershipStatusQuery,
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

    let dealerId: string | null = null;
    const user = getUserFromToken(req);
    if (user && user.role === 'DEALER') {
        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, user.id));
        if (dealer.length > 0) dealerId = dealer[0].id;
    }

    const discountQuery = dealerId
        ? sql<number>`COALESCE((SELECT discount_percentage FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId} AND status = 'APPROVED'), 0)::float`
        : sql<number>`0::float`;

    const dealershipStatusQuery = dealerId
        ? sql<string>`(SELECT status FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId})`
        : sql<string>`null`;

    const product = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      description: products.description,
      basePrice: products.basePrice,
      discountPercentage: discountQuery,
      dealershipStatus: dealershipStatusQuery,
      images: products.images,
      categoryId: products.categoryId,
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

export const getSimilarProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { [key: string]: string };

    let dealerId: string | null = null;
    const user = getUserFromToken(req);
    if (user && user.role === 'DEALER') {
        const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, user.id));
        if (dealer.length > 0) dealerId = dealer[0].id;
    }

    const discountQuery = dealerId
        ? sql<number>`COALESCE((SELECT discount_percentage FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId} AND status = 'APPROVED'), 0)::float`
        : sql<number>`0::float`;

    const dealershipStatusQuery = dealerId
        ? sql<string>`(SELECT status FROM dealer_authorized_products WHERE product_id = products.id AND dealer_id = ${dealerId})`
        : sql<string>`null`;

    const targetProduct = await db.select({ categoryId: products.categoryId }).from(products).where(eq(products.id, id));

    if (targetProduct.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const targetCategoryId = targetProduct[0].categoryId;

    const similarProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      discountPercentage: discountQuery,
      dealershipStatus: dealershipStatusQuery,
      images: products.images,
      categoryName: categories.name,
      averageRating: sql<number>`(SELECT COALESCE(AVG(rating), 0) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::float`,
      reviewCount: sql<number>`(SELECT count(*) FROM product_reviews WHERE product_id = products.id AND status = 'ACTIVE')::int`
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(
      eq(products.categoryId, targetCategoryId),
      ne(products.id, id), 
      eq(products.status, 'ACTIVE')
    ))
    .limit(4);

    res.status(200).json(similarProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};