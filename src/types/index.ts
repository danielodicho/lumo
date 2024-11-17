export interface Participant {
  id: string;
  name: string;
  pledgedAmount: number;
  stripeCustomerId?: string;
  defaultPaymentMethodId?: string;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
}

export interface Actions {
  fetchParticipants: () => Promise<void>;
  addParticipant: (name: string, pledgedAmount: number, paymentMethodId: string) => Promise<void>;
  removeParticipant: (id: string) => Promise<void>;
  updatePledge: (id: string, amount: number) => void;
  processTransaction: (merchantName: string, amount: number) => Promise<void>;
  toggleParticipantSelection: (participantId: string) => void;
  clearSelectedParticipants: () => void;
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

