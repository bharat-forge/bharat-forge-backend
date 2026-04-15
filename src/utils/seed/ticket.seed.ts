import { db } from '../../configs/db';
import { supportTickets, ticketMessages, users, orders } from '../../db/schema';
import crypto from 'crypto';

const randItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export const seedTickets = async () => {
  try {
    const allUsers = await db.select().from(users);
    const allOrders = await db.select().from(orders);

    if (allUsers.length === 0) return;

    const ticketsToInsert: any[] = [];
    const messagesToInsert: any[] = [];

    const subjects = [
      'Issue with recent shipment delivery',
      'Defective part received in bulk order',
      'Need clarification on CNC specifications',
      'Delay in customs clearance',
      'Requesting invoice correction',
      'Payment failed but amount deducted'
    ];

    const statuses = ['OPEN', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

    for (let i = 0; i < 40; i++) {
      const user = randItem(allUsers);
      const order = Math.random() > 0.5 && allOrders.length > 0 ? randItem(allOrders) : null;
      const status = randItem(statuses);
      
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Tickets from the last 30 days
      const createdAt = new Date(past.getTime());

      const ticketId = crypto.randomUUID();

      ticketsToInsert.push({
        id: ticketId,
        creatorId: user.id,
        subject: randItem(subjects),
        description: 'Detailed description regarding the support request logged by the user or dealer.',
        orderId: order ? order.id : null,
        status: status as any,
        callbackRequested: Math.random() > 0.7,
        createdAt,
        updatedAt: createdAt
      });

      messagesToInsert.push({
        ticketId: ticketId,
        senderId: user.id,
        message: 'Hello, I need urgent assistance regarding this matter. Please review the details attached.',
        createdAt
      });
    }

    await db.insert(supportTickets).values(ticketsToInsert);
    await db.insert(ticketMessages).values(messagesToInsert);

  } catch (error) {
    console.error("Error seeding tickets:", error);
  }
};