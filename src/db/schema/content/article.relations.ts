import { relations } from 'drizzle-orm';
import { articleCategories, articles, articleToCategories, articleComments, articleVotes, productReviews, dealerReviews } from './article.schema';
import { users } from '../user/user.schema';
import { products } from '../product/product.schema';
import { dealerProfiles } from '../dealer/dealer.schema';

export const articleCategoriesRelations = relations(articleCategories, ({ many }) => ({
  articles: many(articleToCategories),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  categories: many(articleToCategories),
  comments: many(articleComments),
  votes: many(articleVotes),
}));

export const articleToCategoriesRelations = relations(articleToCategories, ({ one }) => ({
  article: one(articles, {
    fields: [articleToCategories.articleId],
    references: [articles.id],
  }),
  category: one(articleCategories, {
    fields: [articleToCategories.categoryId],
    references: [articleCategories.id],
  }),
}));

export const articleCommentsRelations = relations(articleComments, ({ one }) => ({
  article: one(articles, {
    fields: [articleComments.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [articleComments.userId],
    references: [users.id],
  }),
}));

export const articleVotesRelations = relations(articleVotes, ({ one }) => ({
  article: one(articles, {
    fields: [articleVotes.articleId],
    references: [articles.id],
  }),
  user: one(users, {
    fields: [articleVotes.userId],
    references: [users.id],
  }),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
}));

export const dealerReviewsRelations = relations(dealerReviews, ({ one }) => ({
  dealer: one(dealerProfiles, {
    fields: [dealerReviews.dealerId],
    references: [dealerProfiles.id],
  }),
  user: one(users, {
    fields: [dealerReviews.userId],
    references: [users.id],
  }),
}));