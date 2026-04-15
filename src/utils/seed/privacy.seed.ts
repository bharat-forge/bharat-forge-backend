import { db } from '../../configs/db';
import { privacyPolicies } from '../../db/schema/privacy/privacy.schema';

const mdContent = `
# Bharat Forge Limited - Privacy Policy

This Privacy Policy explains how Bharat Forge Limited ("We", "Us", "Our") collects, uses, and protects your personal and business data when you use our B2B Portal.

## 1. Information We Collect
We collect information that you provide directly to us, including:
- **Account Data:** Names, email addresses, phone numbers, and business credentials (such as GST numbers).
- **Transaction Data:** Order histories, shipping addresses, and payment details (processed securely via our partners).
- **Technical Data:** IP addresses, browser types, and usage analytics to improve our portal.

## 2. How We Use Your Information
We use your data to:
- Process and fulfill your wholesale and retail orders.
- Provide customer support and respond to inquiries.
- Verify dealer credentials and maintain our B2B compliance.
- Send important updates, technical notices, and security alerts.

## 3. Data Sharing and Disclosure
We do not sell your personal data. We may share information with:
- Logistics and shipping partners to deliver your goods.
- Payment processors (like Razorpay) to facilitate secure transactions.
- Legal authorities if required by law or to protect our rights.

## 4. Data Security
We implement industry-standard security measures, including 256-bit SSL encryption, to protect your data during transmission and storage. However, no digital system is completely secure, and we cannot guarantee absolute security.

## 5. Your Rights
You have the right to access, correct, or request the deletion of your personal data. To exercise these rights, please contact our support team.

## 6. Updates to This Policy
We may update this Privacy Policy from time to time. The latest version will always be available on this page, and significant changes will be communicated via email.

*For privacy-related inquiries, please contact privacy@bharatforge.com*
`;

export const seedPrivacy = async () => {
  try {
    await db.insert(privacyPolicies).values({
      version: 'v1.0.0',
      title: 'Global Privacy Policy',
      content: mdContent,
      isActive: true,
    });
  } catch (error) {
  }
};