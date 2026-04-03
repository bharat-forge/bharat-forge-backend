import { pgTable, text, timestamp, integer, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { contentStatusEnum, articleStatusEnum, voteTypeEnum } from '../shared/enums';
import { users } from '../user/user.schema';
import { products } from '../product/product.schema';
import { dealerProfiles } from '../dealer/dealer.schema';

export const articleCategories = pgTable('article_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  supportingImages: text('supporting_images').array(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  status: articleStatusEnum('status').default('DRAFT').notNull(),
  viewsCount: integer('views_count').default(0).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  dislikesCount: integer('dislikes_count').default(0).notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleToCategories = pgTable('article_to_categories', {
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  categoryId: uuid('category_id').references(() => articleCategories.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.categoryId] }),
}));

export const articleComments = pgTable('article_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  comment: text('comment').notNull(),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleVotes = pgTable('article_votes', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  type: voteTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.articleId] }),
}));

export const productReviews = pgTable('product_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealerReviews = pgTable('dealer_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealerId: uuid('dealer_id').references(() => dealerProfiles.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: contentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});