import { db } from '../../configs/db';
import { sql } from 'drizzle-orm';
import { seedAdmin } from './admin.seed';
import { seedUsers } from './user.seed';
import { seedDealers } from './dealer.seed';
import { seedProducts } from './product.seed';
import { seedBlogs } from './blogs.seed';

const destroyData = async () => {
  await db.execute(sql`TRUNCATE TABLE chat_messages, ticket_messages, support_tickets, order_items, orders, cart_items, carts, product_reviews, dealer_reviews, dealer_authorized_products, products, categories, dealer_submissions, dealer_profiles, notifications, users CASCADE;`);
};

const seedData = async () => {
  await seedAdmin();
  await seedUsers();
  await seedDealers();
  await seedProducts();
  await seedBlogs();
};

const run = async () => {
  const arg = process.argv[2];
  try {
    if (arg === '-d') {
      await destroyData();
      process.exit(0);
    } else {
      await destroyData();
      await seedData();
      process.exit(0);
    }
  } catch (error) {
    process.exit(1);
  }
};

run();