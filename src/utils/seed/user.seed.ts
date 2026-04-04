import { db } from '../../configs/db';
import { users } from '../../db/schema';
import bcrypt from 'bcryptjs';
import { logger } from '../logger';

const firstNames = ['Amit', 'Priya', 'Rahul', 'Neha', 'Sanjay', 'Kavita', 'Vikram', 'Pooja', 'Rohan', 'Anita', 'Karan', 'Sneha', 'Arjun', 'Meera', 'Aditya'];
const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Das', 'Joshi', 'Mehta', 'Nair', 'Bose', 'Rao', 'Chauhan', 'Yadav'];

export const seedUsers = async () => {
  try {
    logger.info('⏳ Seeding 40 Users...');
    
    const hashedPassword = await bcrypt.hash('User@123', 10);
    
    const usersToInsert = Array.from({ length: 40 }).map((_, index) => {
      const fName = firstNames[index % firstNames.length];
      const lName = lastNames[(index * 3) % lastNames.length];
      
      const gender = ['a', 'i'].includes(fName.slice(-1)) ? 'FEMALE' : 'MALE';
      
      const mobileNumber = `98765${(index + 10000).toString()}`;
      
      const year = 1980 + (index % 20);
      const month = String((index % 12) + 1).padStart(2, '0');
      const day = String((index % 28) + 1).padStart(2, '0');

      return {
        email: `customer${index + 1}@test.com`,
        password: hashedPassword,
        role: 'USER' as const,
        status: 'ACTIVE' as const,
        metadata: { 
          firstName: fName, 
          lastName: lName,
          mobileNumber: mobileNumber,
          dob: `${year}-${month}-${day}`,
          gender: gender
        },
        settings: {
          isTwoFactorEnabled: false
        }
      };
    });

    await db.insert(users).values(usersToInsert);
    
    logger.info(`✅ Successfully seeded 40 Users with complete onboarding metadata.`);
    logger.info(`🔐 All users use the password: User@123`);
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
  }
};