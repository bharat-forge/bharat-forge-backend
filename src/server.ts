import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectRedis } from './configs/redis';
import { setupSocket } from './configs/socket';
import { errorHandler } from './middlewares/errorMiddleware';
import { logger } from './utils/logger';

import authRoutes from './routes/auth/authRoutes';

import adminArticleCategoryRoutes from './routes/admin/articleCategoryRoutes';
import adminArticleRoutes from './routes/admin/articleRoutes';
import adminCategoryRoutes from './routes/admin/categoryRoutes';
import adminDealerManagementRoutes from './routes/admin/dealerManagementRoutes';
import adminDealershipApprovalRoutes from './routes/admin/dealershipApprovalRoutes';
import adminOrderManagementRoutes from './routes/admin/orderManagementRoutes';
import adminProductRoutes from './routes/admin/productRoutes';
import adminTicketManagementRoutes from './routes/admin/ticketManagementRoutes';
import adminUserManagementRoutes from './routes/admin/userManagementRoutes';

import dealerDealershipRequestRoutes from './routes/dealer/dealershipRequestRoutes';
import dealerVerificationRoutes from './routes/dealer/verificationRoutes';
import inventoryManagementRoutes from './routes/dealer/inventoryManagementRoutes';

import publicArticleRoutes from './routes/public/articleRoutes';
import publicCatalogRoutes from './routes/public/catalogRoutes';
import publicGuidedSearchRoutes from './routes/public/guidedSearchRoutes';
import publicDealerRoutes from './routes/public/dealerRoutes';

import sharedCartRoutes from './routes/shared/cartRoutes';
import sharedChatRoutes from './routes/shared/chatRoutes';
import sharedCheckoutRoutes from './routes/shared/checkoutRoutes';
import sharedNotificationRoutes from './routes/shared/notificationRoutes';
import sharedOrderRoutes from './routes/shared/orderRoutes';
import sharedProfileRoutes from './routes/shared/profileRoutes';
import sharedTicketRoutes from './routes/shared/ticketRoutes';

import userArticleInteractionRoutes from './routes/user/articleInteractionRoutes';
import userDealerReviewRoutes from './routes/user/dealerReviewRoutes';
import userProductReviewRoutes from './routes/user/productReviewRoutes';

const app = express();
const httpServer = http.createServer(app);

setupSocket(httpServer);

app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'Origin', 'Accept']
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.use('/api/admin/article-categories', adminArticleCategoryRoutes);
app.use('/api/admin/articles', adminArticleRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/dealer-management', adminDealerManagementRoutes);
app.use('/api/admin/dealership-approvals', adminDealershipApprovalRoutes);
app.use('/api/admin/order-management', adminOrderManagementRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/ticket-management', adminTicketManagementRoutes);
app.use('/api/admin/users', adminUserManagementRoutes);

app.use('/api/dealer/requests', dealerDealershipRequestRoutes);
app.use('/api/dealer/verification', dealerVerificationRoutes);
app.use('/api/dealer/inventory', inventoryManagementRoutes);

app.use('/api/public/articles', publicArticleRoutes);
app.use('/api/public/catalog', publicCatalogRoutes);
app.use('/api/public/guided-search', publicGuidedSearchRoutes);
app.use('/api/public/dealers', publicDealerRoutes);

app.use('/api/shared/cart', sharedCartRoutes);
app.use('/api/shared/chat', sharedChatRoutes);
app.use('/api/shared/checkout', sharedCheckoutRoutes);
app.use('/api/shared/notifications', sharedNotificationRoutes);
app.use('/api/shared/orders', sharedOrderRoutes);
app.use('/api/shared/profile', sharedProfileRoutes);
app.use('/api/shared/tickets', sharedTicketRoutes);

app.use('/api/user/article-interactions', userArticleInteractionRoutes);
app.use('/api/user/dealer-reviews', userDealerReviewRoutes);
app.use('/api/user/product-reviews', userProductReviewRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

const startServer = async () => {
  try {
    await connectRedis();
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

startServer();