import { relations } from 'drizzle-orm';
import { dealerProfiles, verificationBlueprints, dealerSubmissions } from './dealer.schema';
import { users } from '../user/user.schema';
import { dealerAuthorizedProducts } from '../product/product.schema';
import { dealerReviews } from '../content/article.schema';

export const dealerProfilesRelations = relations(dealerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [dealerProfiles.userId],
    references: [users.id],
  }),
  authorizedProducts: many(dealerAuthorizedProducts),
  submissions: many(dealerSubmissions),
  reviews: many(dealerReviews),
}));

export const verificationBlueprintsRelations = relations(verificationBlueprints, ({ many }) => ({
  submissions: many(dealerSubmissions),
}));

export const dealerSubmissionsRelations = relations(dealerSubmissions, ({ one }) => ({
  dealer: one(dealerProfiles, {
    fields: [dealerSubmissions.dealerId],
    references: [dealerProfiles.id],
  }),
  blueprint: one(verificationBlueprints, {
    fields: [dealerSubmissions.blueprintId],
    references: [verificationBlueprints.id],
  }),
}));