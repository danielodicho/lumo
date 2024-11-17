import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipantPayment {
  participant: mongoose.Types.ObjectId;
  amount: number;
  paymentIntentId: string;
  status: string;
}

export interface ITransaction extends Document {
  groupTransactionId: string;
  merchantName: string;
  totalAmount: number;
  participantPayments: IParticipantPayment[];
  splitInfo: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema({
  groupTransactionId: { type: String, required: true, unique: true },
  merchantName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  participantPayments: [{
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    amount: { type: Number, required: true },
    paymentIntentId: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'succeeded', 'failed'] }
  }],
  splitInfo: { type: String, required: true },
  status: { type: String, required: true, enum: ['pending', 'success', 'failed'] }
}, {
  timestamps: true
});

// Add index for faster queries
TransactionSchema.index({ groupTransactionId: 1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);