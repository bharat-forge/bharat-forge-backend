import { Request, Response } from 'express';
import { db } from '../../configs/db';
import { contactRequests } from '../../db/schema/contact/contact.schema';

export const submitContactRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, inquiryType, message } = req.body;

    if (!name || !email || !inquiryType || !message) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const newRequest = await db.insert(contactRequests).values({
      name,
      email,
      phone,
      company,
      inquiryType,
      message,
    }).returning();

    res.status(201).json({ message: 'Contact request submitted successfully', data: newRequest[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error while submitting request' });
  }
};