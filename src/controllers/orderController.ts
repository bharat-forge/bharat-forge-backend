import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Order from '../models/Order';
import Product from '../models/Product';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpayService';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shippingAddress, paymentMethod, dealerProfileId } = req.body;

    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404).json({ message: `Product not found: ${item.product}` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        return;
      }
      totalAmount += item.price * item.quantity;
    }

    const order = new Order({
      user: req.user._id,
      dealerProfile: dealerProfileId,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod,
    });

    await order.save();

    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(totalAmount, order._id.toString());
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      res.status(201).json({ order, razorpayOrder });
      return;
    }

    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order || !order.razorpayOrderId) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const isValid = verifyRazorpaySignature(order.razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (isValid) {
      order.paymentStatus = 'completed';
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;
      await order.save();

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }

      res.status(200).json({ message: 'Payment verified successfully', order });
    } else {
      order.paymentStatus = 'failed';
      await order.save();
      res.status(400).json({ message: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.product', 'name images');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};