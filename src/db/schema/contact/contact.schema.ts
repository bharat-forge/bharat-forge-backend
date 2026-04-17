import { pgTable, text, timestamp, uuid, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const contactStatusEnum = pgEnum('contact_status', ['PENDING', 'IN_PROGRESS', 'RESOLVED']);

export const contactRequests = pgTable('contact_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  inquiryType: varchar('inquiry_type', { length: 100 }).notNull(),
  message: text('message').notNull(),
  status: contactStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});