import { relations } from 'drizzle-orm';
import { categories, products, dealerAuthorizedProducts } from './product.schema';
import { orderItems, cartItems } from '../order/order.schema';
import { dealerProfiles } from '../dealer/dealer.schema';
import { productReviews } from '../content/article.schema';

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  authorizedDealers: many(dealerAuthorizedProducts),
  reviews: many(productReviews),
}));

export const dealerAuthorizedProductsRelations = relations(dealerAuthorizedProducts, ({ one }) => ({
  dealer: one(dealerProfiles, {
    fields: [dealerAuthorizedProducts.dealerId],
    references: [dealerProfiles.id],
  }),
  product: one(products, {
    fields: [dealerAuthorizedProducts.productId],
    references: [products.id],
  }),
}));