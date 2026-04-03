import { db } from '../../configs/db';
import { users } from '../../db/schema';
import bcrypt from 'bcryptjs';
import { logger } from '../logger';

// Arrays for generating realistic metadata combinations
const firstNames = ['Amit', 'Priya', 'Rahul', 'Neha', 'Sanjay', 'Kavita', 'Vikram', 'Pooja', 'Rohan', 'Anita', 'Karan', 'Sneha', 'Arjun', 'Meera', 'Aditya'];
const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Das', 'Joshi', 'Mehta', 'Nair', 'Bose', 'Rao', 'Chauhan', 'Yadav'];

export const seedUsers = async () => {
  try {
    logger.info('⏳ Seeding 40 Users...');
    
    // 1. Hash the password once for performance
    const hashedPassword = await bcrypt.hash('User@123', 10);
    
    // 2. Generate an array of 40 users programmatically
    const usersToInsert = Array.from({ length: 40 }).map((_, index) => {
      // Pick names dynamically based on the index to create variety
      const fName = firstNames[index % firstNames.length];
      const lName = lastNames[(index * 3) % lastNames.length];
      
      // Determine gender roughly based on the first name's trailing letter (for realism)
      const gender = ['a', 'i'].includes(fName.slice(-1)) ? 'FEMALE' : 'MALE';
      
      // Generate a realistic looking 10-digit mobile number
      const mobileNumber = `98765${(index + 10000).toString()}`;
      
      // Generate a random-ish DOB between 1980 and 1999
      const year = 1980 + (index % 20);
      const month = String((index % 12) + 1).padStart(2, '0');
      const day = String((index % 28) + 1).padStart(2, '0');

      return {
        email: `customer${index + 1}@test.com`,
        password: hashedPassword,
        role: 'USER' as const,
        status: 'ACTIVE' as const,
        // isVerified is completely removed to match the updated schema!
        metadata: { 
          firstName: fName, 
          lastName: lName,
          mobileNumber: mobileNumber,
          dob: `${year}-${month}-${day}`,
          gender: gender
        }
      };
    });

    // 3. Clear existing basic users to prevent duplicate email crashes (Optional but recommended)
    // await db.delete(users).where(eq(users.role, 'USER'));

    // 4. Bulk insert all 40 users
    await db.insert(users).values(usersToInsert);
    
    logger.info(`✅ Successfully seeded 40 Users with complete onboarding metadata.`);
    logger.info(`🔐 All users use the password: User@123`);
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
  }
};