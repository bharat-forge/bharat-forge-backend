import { db } from '../../configs/db';
import { users } from '../../db/schema';
import bcrypt from 'bcryptjs';

export const seedAdmin = async () => {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  await db.insert(users).values({
    email: 'admin@bharatforge.com',
    password: hashedPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    metadata: {
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+91 9876543210',
      mobileNumber: '9876543210'
    }
  });
};