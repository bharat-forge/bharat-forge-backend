import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  order: mongoose.Types.ObjectId;
  invoiceNumber: string;
  dealerProfile?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  fileUrl: string;
  totalAmount: number;
  issuedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    dealerProfile: { type: Schema.Types.ObjectId, ref: 'DealerProfile' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IInvoice>('Invoice', invoiceSchema);