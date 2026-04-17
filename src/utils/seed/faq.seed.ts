import { db } from '../../configs/db';
import { faqs } from '../../db/schema/faq/faq.schema';

const faqData = [
  { category: 'Dealership', question: 'How do I become an authorized Bharat Forge dealer?', answer: 'To become an authorized dealer, navigate to our "Partner With Us" page and submit the application form. You will need to provide your **GSTIN**, **Business Registration**, and **Shop Location details**. Our B2B onboarding team typically reviews applications within 48-72 hours.' },
  { category: 'Dealership', question: 'What is the minimum order quantity (MOQ)?', answer: 'MOQs vary by product category. For instance, commercial tyres typically require a minimum order of 50 units, while specialized forged shafts may have an MOQ of 10 units. Once approved as a dealer, you can view specific MOQs on your dedicated dashboard.' },
  { category: 'Dealership', question: 'Do you offer credit lines for dealers?', answer: 'Yes. After a probationary period of 3 months demonstrating consistent order volume, dealers can apply for a 30-day or 45-day rolling credit facility. This is subject to a financial review by our underwriting team.' },
  { category: 'Dealership', question: 'Can I sell your products online?', answer: 'Authorized dealers are permitted to sell through their own proprietary e-commerce platforms. However, selling Bharat Forge products on third-party marketplaces (like Amazon or Flipkart) requires explicit written authorization from our compliance department.' },
  { category: 'Dealership', question: 'What margins can I expect as a dealer?', answer: 'Dealer margins are tiered based on volume and category. Standard margins range from **15% to 25%**. Platinum tier dealers unlock additional volume rebates and marketing development funds (MDF).' },
  { category: 'Dealership', question: 'Is there a signup fee to become a dealer?', answer: 'No, there is absolutely no signup or franchise fee to join the Bharat Forge network. Your only commitment is meeting the minimum order volumes.' },
  { category: 'Dealership', question: 'How are territories assigned?', answer: 'We map territories based on pincodes to prevent market saturation. When you apply, your primary operational pincodes will be evaluated against our current network density.' },
  { category: 'Dealership', question: 'Can I upgrade my dealer tier?', answer: 'Dealer tiers are automatically evaluated every quarter. Consistently exceeding your volume targets will trigger an automatic upgrade to the next tier, unlocking better pricing.' },
  
  { category: 'Products & Tech', question: 'What certifications do your forged components carry?', answer: 'All our industrial components are fully compliant with Indian and International regulations. We hold **ISO 9001:2015**, **IATF 16949** for automotive quality, and all domestic products carry standard **BIS certification**.' },
  { category: 'Products & Tech', question: 'What is the warranty period on commercial batteries?', answer: 'Our commercial heavy-duty batteries come with a standard **36-month replacement warranty** against manufacturing defects. Warranty claims can be initiated directly through the dealer portal.' },
  { category: 'Products & Tech', question: 'Do you provide custom CNC machining?', answer: 'Yes. While we have a standardized catalog, our manufacturing facilities can handle custom CNC machining based on CAD files for bulk orders. Contact our technical sales team for custom dies.' },
  { category: 'Products & Tech', question: 'What materials are used in your high-tensile shafts?', answer: 'We primarily utilize high-grade alloy steels, specifically **4340 and 4140 chromoly steel**, subjected to advanced thermal tempering processes to ensure maximum tensile strength and fatigue resistance.' },
  { category: 'Products & Tech', question: 'Are your tyres suitable for off-road mining applications?', answer: 'Yes, our OTR (Off-The-Road) tyre catalog includes specialized tread compounds designed specifically for abrasive mining environments, offering superior cut and chip resistance.' },
  { category: 'Products & Tech', question: 'How do you ensure metallurgical consistency?', answer: 'Every batch undergoes rigorous in-house spectrographic and ultrasonic analysis to detect micro-fractures and ensure chemical composition meets exact tolerances before leaving the foundry.' },
  { category: 'Products & Tech', question: 'Do you supply electric vehicle (EV) components?', answer: 'Yes, we have a dedicated product line for EV platforms, including lightweight aluminum forged knuckles and specialized battery housings designed for thermal management.' },
  { category: 'Products & Tech', question: 'What is the shelf life of your automotive batteries?', answer: 'Stored in a cool, dry environment, our maintenance-free batteries have a shelf life of up to 12 months before requiring a top-up charge.' },

  { category: 'Shipping & Logistics', question: 'What are your standard delivery timelines?', answer: 'For domestic orders within India, our standard fulfillment time from warehouse to your dealership is **3-5 business days**. International maritime shipments vary between 15-45 days depending on the destination port.' },
  { category: 'Shipping & Logistics', question: 'How can I track my bulk shipment?', answer: 'Once your order leaves our facility, a live GPS tracking link is generated and attached to the invoice in your Dealer Dashboard. You can monitor the truck or container in real-time.' },
  { category: 'Shipping & Logistics', question: 'What happens if a shipment arrives damaged?', answer: 'In the rare event of transit damage, you must **sign the Proof of Delivery (POD) with remarks** noting the damage. Take photographs immediately and upload them to the Support section of your dashboard within 48 hours for a replacement.' },
  { category: 'Shipping & Logistics', question: 'Do you offer expedited air freight?', answer: 'Air freight is available for urgent, low-weight components (e.g., specialized machine parts) at an additional cost. Heavy items like commercial tyres are restricted to ground and maritime freight.' },
  { category: 'Shipping & Logistics', question: 'Who handles the unloading at my dealership?', answer: 'Standard shipping includes delivery to your loading dock. The dealership is responsible for the actual unloading of goods via forklift or manual labor unless "Inside Delivery" is specifically contracted.' },
  { category: 'Shipping & Logistics', question: 'Are logistics costs included in the wholesale price?', answer: 'Logistics costs are calculated dynamically at checkout based on your location and order volume. Platinum tier dealers receive complimentary standard shipping on all orders over ₹5,000,000.' },
  { category: 'Shipping & Logistics', question: 'Can I pick up my order directly from the warehouse?', answer: 'Yes, "Will Call" pickup is available at our primary hubs in Pune and Chennai. You must schedule a loading dock appointment 24 hours in advance through the portal.' },
  { category: 'Shipping & Logistics', question: 'Do you handle customs clearance for international orders?', answer: 'Our standard international terms are **FOB (Free On Board)**. We handle export clearance from India, but the buyer is responsible for import customs and duties at the destination country.' },

  { category: 'Returns & Support', question: 'What is the return policy for unsold inventory?', answer: 'We operate on a strict B2B model; we do not accept returns for unsold inventory. Returns are only authorized for manufacturing defects or dispatch errors on our end.' },
  { category: 'Returns & Support', question: 'How long does a warranty claim take to process?', answer: 'Our technical team evaluates warranty claims within **48 business hours** of receiving the defective component log and photographs. Approved replacements are dispatched in the next scheduled delivery.' },
  { category: 'Returns & Support', question: 'Is there a dedicated support line for dealers?', answer: 'Yes. All authorized dealers have access to a priority 24/7 B2B support hotline listed in the dashboard, bypassing the standard public queue.' },
  { category: 'Returns & Support', question: 'What happens if I order the wrong SKU?', answer: 'If an error is caught before dispatch, you can cancel or modify the order via the portal. If the goods have already shipped, you will be liable for the return freight costs plus a 15% restocking fee.' },
  { category: 'Returns & Support', question: 'Do you provide technical training for our mechanics?', answer: 'Yes. We offer quarterly on-site technical workshops and continuous digital webinars to ensure your staff understands the installation and maintenance of our advanced components.' },
  { category: 'Returns & Support', question: 'How do I dispute an invoice?', answer: 'Invoice disputes must be filed within 7 days of receipt via the "Billing & Finance" tab in your dashboard. Our finance reconciliation team will audit and respond within 3 business days.' },
  { category: 'Returns & Support', question: 'What if a product causes collateral damage?', answer: 'Our liability is strictly limited to the replacement value of the defective component itself, as outlined in our Global Terms of Service. We do not cover consequential or collateral mechanical damage.' },
  { category: 'Returns & Support', question: 'Can I request a site visit from a Bharat Forge engineer?', answer: 'Site visits can be arranged for complex installations or recurring technical issues. Requests must be routed through your dedicated Account Manager.' },

  { category: 'General', question: 'Where is Bharat Forge headquartered?', answer: 'Our global headquarters and primary manufacturing hub are located in the **Pune Cantonment (Mundhwa)** area of Maharashtra, India.' },
  { category: 'General', question: 'How can I schedule a tour of your manufacturing facility?', answer: 'Facility tours are available exclusively for verified B2B partners and institutional investors. Please contact your Account Manager to schedule an appointment.' },
  { category: 'General', question: 'Are your manufacturing processes environmentally sustainable?', answer: 'Sustainability is a core pillar. Over 60% of our distribution centers use solar energy, and our foundry network operates on a "Zero Waste" protocol where 100% of metallic scrap is recycled.' },
  { category: 'General', question: 'Do you publish an annual ESG report?', answer: 'Yes, our Environmental, Social, and Governance (ESG) report is published annually in Q1 and is available for download in the "Corporate Responsibility" section.' },
  { category: 'General', question: 'How can I apply for a job at Bharat Forge?', answer: 'All current openings are listed on our LinkedIn page and the Careers portal. We do not accept resumes through the general B2B contact forms.' },
  { category: 'General', question: 'What is your corporate social responsibility (CSR) focus?', answer: 'Our CSR initiatives focus primarily on technical education in rural India and funding clean water infrastructure near our heavy manufacturing zones.' },
  { category: 'General', question: 'Do you participate in global trade expos?', answer: 'Yes, we regularly exhibit at major global expos including Automechanika Frankfurt, AAPEX, and Auto Expo New Delhi. Dates are announced via our dealer newsletter.' },
  { category: 'General', question: 'Can we use the Bharat Forge logo in our local marketing?', answer: 'Authorized dealers are provided with a localized brand kit. The logo must be used strictly in accordance with our brand guidelines and cannot be modified.' }
];

export const seedFaqs = async () => {
  try {
    for (let i = 0; i < faqData.length; i++) {
      const item = faqData[i];
      await db.insert(faqs).values({
        question: item.question,
        answer: item.answer,
        category: item.category,
        viewCount: Math.floor(Math.random() * 500) + 10, 
        isActive: true,
      });
    }
  } catch (error) {
  }
};