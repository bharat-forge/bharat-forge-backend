import { razorpayInstance } from '../configs/razorpay';
import crypto from 'crypto';

export const createRazorpayOrder = async (amount: number, receipt: string) => {
  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
  };
  return await razorpayInstance.orders.create(options);
};

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET as string;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
    
  return generatedSignature === signature;
};