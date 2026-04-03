import { relations } from 'drizzle-orm';
import { users, notifications, supportTickets, ticketMessages, chatMessages } from './user.schema';
import { dealerProfiles } from '../dealer/dealer.schema';
import { orders, invoices, carts } from '../order/order.schema';
import { articles, articleComments, articleVotes, productReviews, dealerReviews } from '../content/article.schema';

export const usersRelations = relations(users, ({ one, many }) => ({
  dealerProfile: one(dealerProfiles, {
    fields: [users.id],
    references: [dealerProfiles.userId],
  }),
  cart: one(carts, {
    fields: [users.id],
    references: [carts.userId],
  }),
  orders: many(orders),
  invoices: many(invoices),
  notifications: many(notifications),
  articles: many(articles),
  articleComments: many(articleComments),
  articleVotes: many(articleVotes),
  productReviews: many(productReviews),
  dealerReviews: many(dealerReviews),
  supportTickets: many(supportTickets),
  ticketMessages: many(ticketMessages),
  sentChatMessages: many(chatMessages, { relationName: 'sender' }),
  receivedChatMessages: many(chatMessages, { relationName: 'receiver' }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  creator: one(users, {
    fields: [supportTickets.creatorId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));