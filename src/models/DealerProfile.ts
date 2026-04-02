import mongoose, { Document, Schema } from 'mongoose';

export interface IDealerProfile extends Document {
  user: mongoose.Types.ObjectId;
  businessName: string;
  gstNumber: string;
  contactPerson: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  productCategories: mongoose.Types.ObjectId[];
  status: 'pending' | 'approved' | 'rejected';
  pricingTier: 'standard' | 'silver' | 'gold' | 'platinum';
}

const dealerProfileSchema = new Schema<IDealerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: { type: String, required: true },
    gstNumber: { type: String, required: true, unique: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    productCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    pricingTier: {
      type: String,
      enum: ['standard', 'silver', 'gold', 'platinum'],
      default: 'standard',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDealerProfile>('DealerProfile', dealerProfileSchema);