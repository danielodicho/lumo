import { create } from 'zustand';
import { Participant, Transaction, VirtualCard, PaymentIntent } from '../types';
import { processPayment } from '../services/stripe';

interface State {
  participants: Participant[];
  transactions: Transaction[];
  virtualCard: VirtualCard;
  addParticipant: (name: string, pledgedAmount: number) => void;
  removeParticipant: (id: string) => void;
  updatePledge: (id: string, amount: number) => void;
  processTransaction: (merchantName: string, amount: number) => Promise<void>;
}

const initialState = {
  participants: [],
  transactions: [],
  virtualCard: {
    balance: 0,
    lastFour: '4242',
  },
};

export const useStore = create<State>()((set, get) => ({
  ...initialState,
  
  addParticipant: (name, pledgedAmount) => set((state) => {
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name,
      pledgedAmount,
    };
    
    return {
      participants: [...state.participants, newParticipant],
      virtualCard: {
        ...state.virtualCard,
        balance: state.virtualCard.balance + pledgedAmount,
      },
    };
  }),

  removeParticipant: (id) => set((state) => {
    const participant = state.participants.find(p => p.id === id);
    return {
      participants: state.participants.filter(p => p.id !== id),
      virtualCard: {
        ...state.virtualCard,
        balance: state.virtualCard.balance - (participant?.pledgedAmount || 0),
      },
    };
  }),

  updatePledge: (id, amount) => set((state) => {
    const oldPledge = state.participants.find(p => p.id === id)?.pledgedAmount || 0;
    return {
      participants: state.participants.map(p => 
        p.id === id ? { ...p, pledgedAmount: amount } : p
      ),
      virtualCard: {
        ...state.virtualCard,
        balance: state.virtualCard.balance - oldPledge + amount,
      },
    };
  }),

  processTransaction: async (merchantName, amount) => {
    const state = get();
    const totalPledged = state.participants.reduce((sum, p) => sum + p.pledgedAmount, 0);
    
    // Calculate splits based on pledge ratios
    const splits = state.participants.map(participant => ({
      participantId: participant.id,
      amount: (participant.pledgedAmount / totalPledged) * amount,
      status: 'pending' as const,
    }));

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      merchantName,
      totalAmount: amount,
      date: new Date(),
      splits,
      status: 'pending',
      paymentIntents: [],
    };

    // Add transaction in pending state
    set((state) => ({
      transactions: [...state.transactions, newTransaction],
    }));

    // Process payments for each participant
    const paymentPromises = splits.map(async (split) => {
      const paymentIntent = await processPayment(split.amount, split.participantId);
      return paymentIntent;
    });

    const paymentIntents = await Promise.all(paymentPromises);
    const allSucceeded = paymentIntents.every(pi => pi.status === 'succeeded');

    // Update transaction with payment results
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === newTransaction.id
          ? {
              ...t,
              status: allSucceeded ? 'completed' : 'failed',
              splits: t.splits.map(split => ({
                ...split,
                status: paymentIntents.find(pi => pi.participantId === split.participantId)?.status || 'failed',
              })),
              paymentIntents,
            }
          : t
      ),
      virtualCard: {
        ...state.virtualCard,
        balance: allSucceeded 
          ? state.virtualCard.balance - amount
          : state.virtualCard.balance,
      },
    }));
  },
}));