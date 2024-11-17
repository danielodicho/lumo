import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
  name: string;
  pledgedAmount: number;
  stripeCustomerId: string;
  defaultPaymentMethodId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema({
  name: { type: String, required: true },
  pledgedAmount: { type: Number, required: true },
  stripeCustomerId: { type: String, required: true, unique: true },
  defaultPaymentMethodId: { type: String },
}, { timestamps: true });

export default mongoose.model<IParticipant>('Participant', ParticipantSchema);
