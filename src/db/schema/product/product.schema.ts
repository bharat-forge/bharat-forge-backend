import { pgTable, text, timestamp, boolean, jsonb, doublePrecision, integer, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { categoryStatusEnum, productStatusEnum, authorizationStatusEnum } from '../shared/enums';
import { dealerProfiles } from '../dealer/dealer.schema';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  searchBlueprint: jsonb('search_blueprint'),
  status: categoryStatusEnum('status').default('ACTIVE').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  hsnCode: text('hsn_code').notNull(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  description: text('description').notNull(),
  images: text('images').array(),
  basePrice: doublePrecision('base_price').notNull(),
  moq: integer('moq').default(1).notNull(),
  stock: integer('stock').default(0).notNull(),
  certifications: text('certifications').array(),
  warrantyInfo: text('warranty_info'),
  status: productStatusEnum('status').default('ACTIVE').notNull(),
  deletedAt: timestamp('deleted_at'),
  specifications: jsonb('specifications'),
  compatibilities: jsonb('compatibilities'),
  bulkPricing: jsonb('bulk_pricing'),
  averageRating: doublePrecision('average_rating').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealerAuthorizedProducts = pgTable('dealer_authorized_products', {
  dealerId: uuid('dealer_id').references(() => dealerProfiles.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  status: authorizationStatusEnum('status').default('PENDING').notNull(),
  discountPercentage: doublePrecision('discount_percentage').default(0).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
}, (t) => ({
  pk: primaryKey({ columns: [t.dealerId, t.productId] }),
}));