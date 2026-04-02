import mongoose, { Document, Schema } from 'mongoose';

interface PricingTier {
  minQuantity: number;
  price: number;
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  hsnCode: string;
  category: mongoose.Types.ObjectId;
  description: string;
  specifications: Record<string, string>;
  images: string[];
  basePrice: number;
  bulkPricing: PricingTier[];
  moq: number;
  stock: number;
  certifications: string[];
  warrantyInfo: string;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    hsnCode: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, required: true },
    specifications: { type: Map, of: String },
    images: [{ type: String }],
    basePrice: { type: Number, required: true },
    bulkPricing: [
      {
        minQuantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    moq: { type: Number, default: 1 },
    stock: { type: Number, required: true, default: 0 },
    certifications: [{ type: String }],
    warrantyInfo: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', productSchema);