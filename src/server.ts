import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './configs/db';
import { connectRedis } from './configs/redis';
import { errorHandler } from './middlewares/errorMiddleware';
import { logger } from './utils/logger';

import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import dealerRoutes from './routes/dealerRoutes';
import orderRoutes from './routes/orderRoutes';

const app = express();

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
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

startServer();