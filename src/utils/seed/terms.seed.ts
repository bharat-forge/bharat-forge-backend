import { db } from '../../configs/db';
import { termsConditions } from '../../db/schema/terms/term.schema';

const mdContent = `
# Bharat Forge Limited - Terms and Conditions

Welcome to the Bharat Forge B2B Portal. These Terms and Conditions govern your use of our platform, wholesale ordering systems, and product catalog. By accessing our services, you agree to comply with the terms set forth below.

## 1. Introduction
Bharat Forge is a global leader in metal forming and distributing premium forged and machined components. We act as a primary supplier for automotive, aerospace, and industrial markets. These terms define the legal relationship between Bharat Forge ("We", "Us", "Our") and the buyer ("You", "Your", "Customer", "Dealer").

## 2. Orders and Acceptance
- **Retail Orders:** All orders placed through the public catalog are subject to inventory availability and acceptance.
- **Wholesale/Dealer Orders:** Dealers must maintain an active, approved account to access wholesale pricing and bulk tiers. We reserve the right to cancel or hold orders if there are discrepancies in payment or documentation.
- Order confirmation emails do not constitute a legally binding contract until the goods are dispatched from our manufacturing or warehousing facilities.

## 3. Pricing and Payments
- All prices are displayed in INR unless otherwise specified for international accounts.
- Payments must be completed at checkout via approved payment gateways (Razorpay, NetBanking, UPI).
- Wholesale accounts may be subject to alternative credit terms if pre-approved by our finance team.
- Bharat Forge is not responsible for international transaction fees, conversion rates, or duties levied by the destination country.

## 4. Shipping and Logistics
- **FOB Terms:** For international freight, our responsibility typically ends when the goods pass the ship's rail at the named port of shipment, unless specified otherwise in a separate logistics contract.
- Shipping timelines provided are estimates and not guaranteed.
- We do not assume liability for delays caused by customs processing or force majeure events affecting global supply chains.

## 5. Quality Assurance and Returns
- Bharat Forge prides itself on rigorous metallurgical testing, ISO certifications, and precision grading standards.
- If you receive damaged or out-of-spec components, you must report the issue within 7 days of delivery, including photographic and technical evidence.
- Approved returns or replacements will be processed according to our standard warranty policies for industrial components.

## 6. Intellectual Property
All content on this platform, including text, graphics, logos, product blueprints, and technical specifications, is the property of Bharat Forge Limited and is protected by international copyright and patent laws.

## 7. Limitation of Liability
In no event shall Bharat Forge be liable for any indirect, incidental, special, or consequential damages arising out of the use, mechanical failure, or inability to use our products or services outside of stated operational limits.

## 8. Governing Law
These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these terms will be subject to the exclusive jurisdiction of the courts of Pune, Maharashtra.

## 9. Modifications
We reserve the right to update or modify these Terms and Conditions at any time. Changes will be effective immediately upon posting to this page. Your continued use of the platform constitutes your acceptance of the revised terms.

*For inquiries, please contact legal@bharatforge.com*
`;

export const seedTerms = async () => {
  try {
    await db.insert(termsConditions).values({
      version: 'v1.0.0',
      title: 'Global Terms of Service & Supply',
      content: mdContent,
      isActive: true,
    });
  } catch (error) {
  }
};