// import Invoice from '../models/Invoice';
// import Order from '../models/Order';

// export const generateInvoiceRecord = async (
//   orderId: string,
//   fileUrl: string
// ) => {
//   const order = await Order.findById(orderId);
//   if (!order) throw new Error('Order not found');

//   const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

//   const invoice = new Invoice({
//     order: order._id,
//     invoiceNumber,
//     user: order.user,
//     dealerProfile: order.dealerProfile,
//     fileUrl,
//     totalAmount: order.totalAmount,
//   });

//   await invoice.save();
//   return invoice;
// };