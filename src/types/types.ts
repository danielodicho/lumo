export interface Card {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface Participant {
  id: string;
  name: string;
  pledgedAmount: number;
  stripeCustomerId: string;
  defaultPaymentMethodId?: string;
  card?: Card;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipantPayment {
  participant: string | { _id: string; name: string };
  amount: number;
  paymentIntentId: string;
  status: 'pending' | 'succeeded' | 'failed';
}

export interface Transaction {
  _id: string;
  id: string;
  groupTransactionId: string;
  merchantName: string;
  totalAmount: number;
  participantPayments: ParticipantPayment[];
  splitInfo: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualCard {
  balance: number;
  lastFour: string;
}

export interface PaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface TransactionSplit {
  participantId: string;
  amount: number;
}