import { db } from '../../configs/db';
import { users, dealerProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { logger } from '../logger';

const dealersData = [
  { businessName: 'Prime Auto Parts', contactPerson: 'Mike Ross', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstNumber: '27AABCU9603R1ZX', status: 'APPROVED' },
  { businessName: 'Apex Spares & Gears', contactPerson: 'Ramesh Patel', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', gstNumber: '24AABCU9603R1ZY', status: 'APPROVED' },
  { businessName: 'Global Auto Distributors', contactPerson: 'Suresh Menon', city: 'Bangalore', state: 'Karnataka', pincode: '560001', gstNumber: '29AABCU9603R1ZZ', status: 'APPROVED' },
  { businessName: 'Nexus Auto Corp', contactPerson: 'Anita Desai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', gstNumber: '33AABCU9603R1ZA', status: 'APPROVED' },
  { businessName: 'Forge & Gear Agencies', contactPerson: 'Rajesh Kumar', city: 'Pune', state: 'Maharashtra', pincode: '411001', gstNumber: '27AABCU9603R1ZB', status: 'PENDING' },
  { businessName: 'Metro Automotives', contactPerson: 'Mohammed Ali', city: 'Hyderabad', state: 'Telangana', pincode: '500001', gstNumber: '36AABCU9603R1ZC', status: 'APPROVED' },
  { businessName: 'Standard Auto Ltd', contactPerson: 'Vikram Singh', city: 'Kolkata', state: 'West Bengal', pincode: '700001', gstNumber: '19AABCU9603R1ZD', status: 'APPROVED' },
  { businessName: 'Pioneer Spares', contactPerson: 'Neha Sharma', city: 'Delhi', state: 'Delhi', pincode: '110001', gstNumber: '07AABCU9603R1ZE', status: 'APPROVED' },
  { businessName: 'Elite Spares Hub', contactPerson: 'Sanjay Gupta', city: 'Surat', state: 'Gujarat', pincode: '395001', gstNumber: '24AABCU9603R1ZF', status: 'APPROVED' },
  { businessName: 'Dynamic Parts India', contactPerson: 'Amitabh Verma', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', gstNumber: '08AABCU9603R1ZG', status: 'SUSPENDED_PURCHASES' },
  { businessName: 'Velocity Distributors', contactPerson: 'Priya Reddy', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', gstNumber: '09AABCU9603R1ZH', status: 'APPROVED' },
  { businessName: 'Precision Auto', contactPerson: 'Gurpreet Singh', city: 'Chandigarh', state: 'Chandigarh', pincode: '160017', gstNumber: '04AABCU9603R1ZI', status: 'APPROVED' },
  { businessName: 'Royal Gears & Spares', contactPerson: 'Manoj Tiwari', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', gstNumber: '23AABCU9603R1ZJ', status: 'PENDING' },
  { businessName: 'National Auto Agency', contactPerson: 'Kavita Joshi', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', gstNumber: '23AABCU9603R1ZK', status: 'APPROVED' },
  { businessName: 'Supreme Components', contactPerson: 'George Thomas', city: 'Kochi', state: 'Kerala', pincode: '682001', gstNumber: '32AABCU9603R1ZL', status: 'APPROVED' },
  { businessName: 'United Auto Traders', contactPerson: 'Karthik N', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', gstNumber: '33AABCU9603R1ZM', status: 'APPROVED' },
  { businessName: 'Maxima Motors', contactPerson: 'Santosh Rathi', city: 'Nagpur', state: 'Maharashtra', pincode: '440001', gstNumber: '27AABCU9603R1ZN', status: 'APPROVED' },
  { businessName: 'Oriental Spares', contactPerson: 'Ravi Paswan', city: 'Patna', state: 'Bihar', pincode: '800001', gstNumber: '10AABCU9603R1ZO', status: 'PENDING' },
  { businessName: 'Horizon Auto', contactPerson: 'Subhashankar B', city: 'Bhubaneswar', state: 'Odisha', pincode: '751001', gstNumber: '21AABCU9603R1ZP', status: 'APPROVED' },
  { businessName: 'Summit Parts Ltd', contactPerson: 'Arup Das', city: 'Guwahati', state: 'Assam', pincode: '781001', gstNumber: '18AABCU9603R1ZQ', status: 'SUSPENDED_FULL' }
];

export const seedDealers = async () => {
  try {
    await db.delete(dealerProfiles);
    await db.delete(users).where(eq(users.role, 'DEALER'));

    const hashedPassword = await bcrypt.hash('Dealer@123', 10);

    const usersToInsert = dealersData.map((dealer, index) => {
      const [firstName, ...lastNames] = dealer.contactPerson.split(' ');
      const phone = `98765432${index.toString().padStart(2, '0')}`;
      
      return {
        email: `dealer${index + 1}@test.com`,
        password: hashedPassword,
        role: 'DEALER' as const,
        status: 'ACTIVE' as const,
        metadata: {
          firstName,
          lastName: lastNames.join(' '),
          businessName: dealer.businessName,
          phone,
          mobileNumber: phone
        }
      };
    });

    const insertedUsers = await db.insert(users).values(usersToInsert).returning({ id: users.id });

    const profilesToInsert = dealersData.map((dealer, index) => {
      const phone = `98765432${index.toString().padStart(2, '0')}`;
      
      return {
        userId: insertedUsers[index].id,
        businessName: dealer.businessName,
        gstNumber: dealer.gstNumber,
        contactPerson: dealer.contactPerson,
        phone,
        street: `Shop No. ${index + 10}, Industrial Estate`,
        city: dealer.city,
        state: dealer.state,
        pincode: dealer.pincode,
        country: 'India',
        status: dealer.status as any,
        pricingTier: 'standard',
        averageRating: parseFloat((Math.random() * (5 - 3.8) + 3.8).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 150) + 10,
      };
    });

    await db.insert(dealerProfiles).values(profilesToInsert);

    logger.info(`✅ Successfully seeded ${profilesToInsert.length} Dealers.`);
  } catch (error) {
    logger.error('❌ Error seeding dealers:', error);
  }
};