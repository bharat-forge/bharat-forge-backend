import { pgTable, text, timestamp, doublePrecision, integer, uuid } from 'drizzle-orm/pg-core';
import { orderStatusEnum, paymentStatusEnum, refundStatusEnum } from '../shared/enums';
import { users } from '../user/user.schema';
import { dealerProfiles } from '../dealer/dealer.schema';
import { products } from '../product/product.schema';

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').references(() => carts.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  dealerProfileId: uuid('dealer_profile_id').references(() => dealerProfiles.id),
  totalAmount: doublePrecision('total_amount').notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('PENDING').notNull(),
  refundStatus: refundStatusEnum('refund_status').default('NONE').notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),
  shippingStreet: text('shipping_street').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingState: text('shipping_state').notNull(),
  shippingPincode: text('shipping_pincode').notNull(),
  shippingCountry: text('shipping_country').default('India').notNull(),
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull().unique(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  dealerProfileId: uuid('dealer_profile_id').references(() => dealerProfiles.id),
  fileUrl: text('file_url').notNull(),
  totalAmount: doublePrecision('total_amount').notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
});