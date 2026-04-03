import { pgTable, text, timestamp, doublePrecision, integer, uuid, boolean } from 'drizzle-orm/pg-core';
import { dealerStatusEnum, submissionStatusEnum, blueprintStatusEnum, verificationTypeEnum } from '../shared/enums';
import { users } from '../user/user.schema';

export const dealerProfiles = pgTable('dealer_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  businessName: text('business_name').notNull(),
  gstNumber: text('gst_number').notNull().unique(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  country: text('country').default('India').notNull(),
  status: dealerStatusEnum('status').default('PENDING').notNull(),
  pricingTier: text('pricing_tier').default('standard').notNull(),
  averageRating: doublePrecision('average_rating').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verificationBlueprints = pgTable('verification_blueprints', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: verificationTypeEnum('type').default('FILE').notNull(),
  isRequired: boolean('is_required').default(true).notNull(),
  status: blueprintStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealerSubmissions = pgTable('dealer_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealerId: uuid('dealer_id').references(() => dealerProfiles.id).notNull(),
  blueprintId: uuid('blueprint_id').references(() => verificationBlueprints.id).notNull(),
  submittedValue: text('submitted_value').notNull(),
  status: submissionStatusEnum('status').default('PENDING').notNull(),
  adminRemarks: text('admin_remarks'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealerInventory = pgTable('dealer_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealerId: uuid('dealer_id').references(() => dealerProfiles.id).notNull(),
  productId: uuid('product_id').notNull(), 
  quantity: integer('quantity').default(0).notNull(),
  lastRestockedAt: timestamp('last_restocked_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dealerManualSales = pgTable('dealer_manual_sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealerId: uuid('dealer_id').references(() => dealerProfiles.id).notNull(),
  productId: uuid('product_id').notNull(),
  quantitySold: integer('quantity_sold').notNull(),
  salePrice: doublePrecision('sale_price').notNull(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  invoiceReference: text('invoice_reference'),
  saleDate: timestamp('sale_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});