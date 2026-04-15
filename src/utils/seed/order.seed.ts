import { db } from '../../configs/db';
import { orders, orderItems, invoices, users, products, dealerProfiles } from '../../db/schema';
import crypto from 'crypto';

const getRandomDate = () => {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - 5); // Spread across the last 5-6 months
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
};

const randItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const seedOrders = async () => {
  try {
    const allUsers = await db.select().from(users);
    const allProducts = await db.select().from(products);
    const allDealers = await db.select().from(dealerProfiles);

    if (allUsers.length === 0 || allProducts.length === 0) return;

    const ordersToInsert: any[] = [];
    const itemsToInsert: any[] = [];
    const invoicesToInsert: any[] = [];

    const statuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED'];

    // Generate 150 orders to make the graphs look well-populated
    for (let i = 0; i < 150; i++) {
      const user = randItem(allUsers);
      const isDealer = user.role === 'DEALER';
      const dealerProfile = isDealer ? allDealers.find(d => d.userId === user.id) : null;
      
      const numItems = randInt(1, 4);
      let totalAmount = 0;
      const orderDate = getRandomDate();
      const status = randItem(statuses);
      const paymentStatus = status === 'CANCELLED' ? randItem(['PENDING', 'FAILED']) : 'COMPLETED';

      const tempOrderItems = [];

      for (let j = 0; j < numItems; j++) {
        const product = randItem(allProducts);
        const quantity = isDealer ? randInt(10, 50) : randInt(1, 4);
        const price = product.basePrice;
        totalAmount += price * quantity;

        tempOrderItems.push({
          productId: product.id,
          quantity,
          price
        });
      }

      // Generate a UUID locally so we can link order items and invoices immediately
      const orderId = crypto.randomUUID();

      ordersToInsert.push({
        id: orderId,
        userId: user.id,
        dealerProfileId: dealerProfile ? dealerProfile.id : null,
        totalAmount,
        status: status as any,
        paymentMethod: 'razorpay',
        paymentStatus: paymentStatus as any,
        refundStatus: status === 'CANCELLED' && paymentStatus === 'COMPLETED' ? 'COMPLETED' : 'NONE',
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        razorpayPaymentId: paymentStatus === 'COMPLETED' ? `pay_${crypto.randomBytes(8).toString('hex')}` : null,
        shippingStreet: `123 Industrial Area Phase ${randInt(1, 5)}`,
        shippingCity: randItem(['Pune', 'Mumbai', 'Chennai', 'Delhi', 'Bangalore']),
        shippingState: randItem(['Maharashtra', 'Tamil Nadu', 'Delhi', 'Karnataka']),
        shippingPincode: `40000${randInt(1, 9)}`,
        shippingCountry: 'India',
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      tempOrderItems.forEach(item => {
        itemsToInsert.push({
          orderId,
          ...item
        });
      });

      if (paymentStatus === 'COMPLETED') {
        // Fix: Use crypto random bytes AND the loop index 'i' to guarantee uniqueness
        const uniqueSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        invoicesToInsert.push({
          orderId,
          invoiceNumber: `INV-${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${uniqueSuffix}-${i}`,
          userId: user.id,
          dealerProfileId: dealerProfile ? dealerProfile.id : null,
          fileUrl: 'https://example.com/dummy-invoice.pdf',
          totalAmount,
          issuedAt: orderDate
        });
      }
    }

    // Insert in batches to prevent payload limits
    await db.insert(orders).values(ordersToInsert);
    await db.insert(orderItems).values(itemsToInsert);
    
    if (invoicesToInsert.length > 0) {
      await db.insert(invoices).values(invoicesToInsert);
    }
    
    console.log(`✅ Successfully seeded ${ordersToInsert.length} Orders and associated invoices.`);

  } catch (error) {
    console.error("❌ Error seeding orders:", error);
  }
};