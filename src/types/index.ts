export interface Participant {
  id: string;
  name: string;
  pledgedAmount: number;
}

export interface Transaction {
  id: string;
  merchantName: string;
  totalAmount: number;
  date: Date;
  splits: TransactionSplit[];
  status: 'pending' | 'completed' | 'failed';
  paymentIntents: PaymentIntent[];
}

export interface TransactionSplit {
  participantId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  error?: string | null;
}

export interface VirtualCard {
  balance: number;
  lastFour: string;
}

export interface PaymentIntent {
  id: string;
  status: 'succeeded' | 'failed';
  amount: number;
  participantId: string;
  error: string | null;
}