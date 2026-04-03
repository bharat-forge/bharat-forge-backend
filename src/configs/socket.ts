import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { ticketMessages, chatMessages, supportTickets } from '../db/schema';
import { eq } from 'drizzle-orm';

export const setupSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.id;
    const userRole = socket.data.user.role;

    socket.on('joinTicket', (ticketId: string) => {
      socket.join(`ticket_${ticketId}`);
    });

    socket.on('sendTicketMessage', async (data: { ticketId: string, message: string }) => {
      try {
        const ticketCheck = await db.select().from(supportTickets).where(eq(supportTickets.id, data.ticketId));
        
        if (ticketCheck.length > 0 && ticketCheck[0].status === 'OPEN') {
          const newMessage = await db.insert(ticketMessages).values({
            ticketId: data.ticketId,
            senderId: userId,
            message: data.message
          }).returning();

          io.to(`ticket_${data.ticketId}`).emit('ticketMessage', {
            ...newMessage[0],
            senderRole: userRole
          });
        }
      } catch (error) {
        console.error('Error saving ticket message:', error);
      }
    });

    socket.on('join_chat', (targetUserId: string) => {
      const roomId = [userId, targetUserId].sort().join('_');
      socket.join(`chat_${roomId}`);
    });

    socket.on('send_chat_message', async (data: { receiverId: string, content: string }) => {
      try {
        const roomId = [userId, data.receiverId].sort().join('_');
        
        const newMessage = await db.insert(chatMessages).values({
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
          deliveryStatus: 'SENT'
        }).returning();

        io.to(`chat_${roomId}`).emit('receive_chat_message', newMessage[0]);
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
    });

    socket.on('update_message_status', async (data: { messageId: string, targetUserId: string, status: string }) => {
      try {
        await db.update(chatMessages)
          .set({ deliveryStatus: data.status as any })
          .where(eq(chatMessages.id, data.messageId));

        const roomId = [userId, data.targetUserId].sort().join('_');
        io.to(`chat_${roomId}`).emit('message_status_updated', {
          messageId: data.messageId,
          status: data.status
        });
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    });

    socket.on('disconnect', () => {});

    socket.on('send_bulk_chat', async (data: { targetRole: 'USER' | 'DEALER', content: string }) => {
      try {
        if (userRole !== 'ADMIN') return; 

        // 1. Fetch all active users of the target role
        const { users } = await import('../db/schema');
        const { and, eq } = await import('drizzle-orm');
        
        const targetUsers = await db.select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, data.targetRole), eq(users.status, 'ACTIVE')));

        if (targetUsers.length === 0) return;

        // 2. Prepare bulk insert payload
        const messagesToInsert = targetUsers.map(u => ({
          senderId: userId,
          receiverId: u.id,
          content: data.content,
          deliveryStatus: 'SENT' as any
        }));

        // 3. Insert all messages
        await db.insert(chatMessages).values(messagesToInsert);

        // 4. Emit to individual rooms so connected users get it instantly
        for (const u of targetUsers) {
          const roomId = [userId, u.id].sort().join('_');
          io.to(`chat_${roomId}`).emit('receive_chat_message', {
            senderId: userId,
            receiverId: u.id,
            content: data.content,
            deliveryStatus: 'SENT',
            createdAt: new Date().toISOString()
          });
        }

        // 5. Tell the admin the broadcast was successful
        socket.emit('bulk_message_sent', {
          targetRole: data.targetRole,
          content: data.content,
          recipientCount: targetUsers.length,
          createdAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error sending bulk chat message:', error);
      }
    });
  });

  return io;
};