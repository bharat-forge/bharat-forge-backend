import { db } from '../../configs/db';
import { contactRequests } from '../../db/schema/contact/contact.schema';

export const seedContactRequests = async () => {
  try {
    await db.insert(contactRequests).values([
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.k@example.com',
        phone: '+91 98765 43210',
        company: 'Kumar Auto Spares',
        inquiryType: 'Dealership Application',
        message: 'I am interested in becoming an authorized dealer for Bharat Forge in the Maharashtra region. Please provide the partnership requirements and onboarding process details.',
        status: 'PENDING',
      },
      {
        name: 'Sarah Jenkins',
        email: 's.jenkins@globallogistics.com',
        phone: '+1 555 019 8273',
        company: 'Global Logistics Ltd',
        inquiryType: 'Bulk Order Request',
        message: 'We are looking to procure 500 units of heavy-duty commercial tyres for our new transport fleet. Please provide a wholesale quote and estimated lead times to Frankfurt.',
        status: 'IN_PROGRESS',
      },
      {
        name: 'Amit Patel',
        email: 'amit.patel@techbuild.in',
        phone: '+91 91234 56789',
        company: 'TechBuild Engineering',
        inquiryType: 'Technical Support',
        message: 'We are requesting the detailed metallurgical testing reports and tensile strength data for the latest batch of CNC machined shafts delivered last week.',
        status: 'RESOLVED',
      },
      {
        name: 'David Chen',
        email: 'd.chen@nexautomotive.sg',
        phone: '+81 90 1234 5678',
        company: 'Nexa Automotive',
        inquiryType: 'Logistics & Tracking',
        message: 'Checking on the status of our container shipment (Ref: BFL-88392). The tracking portal shows it held up at customs.',
        status: 'PENDING',
      }
    ]);
  } catch (error) {
  }
};