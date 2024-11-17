import { create } from 'zustand';
import { Participant, Transaction, VirtualCard, PaymentIntent, TransactionSplit } from '../types/types';
import { processPayment } from '../services/stripe';
import axios from 'axios';

interface StoreState {
  participants: Participant[];
  transactions: Transaction[];
  selectedParticipants: Set<string>;
  virtualCard: VirtualCard;
}

interface StoreActions {
  fetchParticipants: () => Promise<void>;
  addParticipant: (name: string, pledgedAmount: number, paymentMethodId: string) => Promise<void>;
  removeParticipant: (id: string) => void;
  updatePledge: (id: string, amount: number) => Promise<void>;
  processTransaction: (merchantName: string, amount: number) => Promise<void>;
  toggleParticipantSelection: (id: string) => void;
  fetchTransactions: () => Promise<void>;
  getTransactionById: (id: string) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

type Store = StoreState & StoreActions;

const initialState: StoreState = {
  participants: [],
  transactions: [],
  selectedParticipants: new Set(),
  virtualCard: {
    balance: 0,
    lastFour: '4242',
  },
};

const API_URL = 'http://localhost:3001';

export const useStore = create<Store>()((set, get) => ({
  ...initialState,

  fetchParticipants: async () => {
    try {
      const response = await axios.get<Participant[]>(`${API_URL}/api/participants`);
      set({ participants: response.data });
      
      // Update virtual card balance based on total of all pledges
      const totalBalance = response.data.reduce((sum, p) => sum + p.pledgedAmount, 0);
      
      set(state => ({
        ...state,
        virtualCard: {
          ...state.virtualCard,
          balance: totalBalance,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      throw error;
    }
  },


  addParticipant: async (name: string, pledgedAmount: number, paymentMethodId: string) => {
    try {
      const response = await axios.post<Participant>(`${API_URL}/api/participants`, {
        name,
        pledgedAmount,
        paymentMethodId,
      });

      set(state => ({
        participants: [...state.participants, response.data],
        virtualCard: {
          ...state.virtualCard,
          balance: state.virtualCard.balance + pledgedAmount,
        },
      }));
    } catch (error) {
      console.error('Failed to add participant:', error);
      throw error;
    }
  },

  removeParticipant: async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/participants/${id}`);
      await get().fetchParticipants();
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw error;
    }
  },

  updatePledge: async (id: string, amount: number) => {
    try {
      await axios.patch(`${API_URL}/api/participants/${id}/pledge`, { amount });
      
      set(state => {
        const oldParticipant = state.participants.find(p => p.id === id);
        const oldAmount = oldParticipant?.pledgedAmount || 0;
        const difference = amount - oldAmount;
        
        return {
          participants: state.participants.map(p =>
            p.id === id ? { ...p, pledgedAmount: amount } : p
          ),
          virtualCard: {
            ...state.virtualCard,
            balance: state.virtualCard.balance + difference,
          },
        };
      });
    } catch (error) {
      console.error('Failed to update pledge:', error);
      throw error;
    }
  },

  toggleParticipantSelection: (id: string) => set((state) => {
    const newSelected = new Set(state.selectedParticipants);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    return { selectedParticipants: newSelected };
  }),

  processTransaction: async (merchantName: string, amount: number) => {
    const state = get();
    const selectedParticipantIds = Array.from(state.selectedParticipants);

    if (selectedParticipantIds.length === 0) {
      throw new Error('No participants selected');
    }

    const amountPerParticipant = Math.floor(amount / selectedParticipantIds.length);
    console.log('Transaction amounts:', {
      totalAmount: amount,
      participantCount: selectedParticipantIds.length,
      amountPerParticipant
    });
    
    // Check if split amount is below Stripe's minimum
    if (amountPerParticipant < 0.50) {
      throw new Error(`Split amount per participant ($${amountPerParticipant.toFixed(2)}) must be at least $0.50 USD`);
    }

    // Validate total available funds before proceeding
    const totalAvailableFunds = selectedParticipantIds.reduce((total, participantId) => {
      const participant = state.participants.find((p) => p.id === participantId);
      return total + (participant?.pledgedAmount || 0);
    }, 0);

    if (totalAvailableFunds < amount) {
      throw new Error(`Insufficient total funds. Available: $${totalAvailableFunds.toFixed(2)}, Required: $${amount.toFixed(2)}`);
    }

    // Validate individual participant funds before proceeding
    const insufficientParticipants = selectedParticipantIds
      .map(participantId => {
        const participant = state.participants.find((p) => p.id === participantId);
        if (!participant) return null;
        return {
          name: participant.name,
          available: participant.pledgedAmount,
          required: amountPerParticipant,
          hasEnough: (participant.pledgedAmount >= amountPerParticipant)
        };
      })
      .filter(p => p && !p.hasEnough);

    if (insufficientParticipants.length > 0) {
      const details = insufficientParticipants
        .map(p => `${p?.name} (has: $${p?.available.toFixed(2)}, needs: $${p?.required.toFixed(2)})`)
        .join(', ');
      throw new Error(`Insufficient funds for some participants: ${details}`);
    }

    const groupTransactionId = crypto.randomUUID(); // Generate a unique ID for this group of transactions

    try {
      // Process payment for each selected participant
      const paymentResults = await Promise.all(
        selectedParticipantIds.map(async (participantId) => {
          const participant = state.participants.find((p) => p.id === participantId);
          if (!participant) return null;

          if (!participant.stripeCustomerId) {
            throw new Error(`No Stripe customer ID found for ${participant.name}`);
          }

          if (!participant.defaultPaymentMethodId) {
            throw new Error(`No payment method found for ${participant.name}`);
          }

          const currentPledgedAmount = Number(participant.pledgedAmount);
          if (currentPledgedAmount < amountPerParticipant) {
            throw new Error(`Insufficient funds for ${participant.name}. Needs: $${amountPerParticipant}`);
          }

          try {
            const splitInfo = `Split payment: $${amountPerParticipant} of $${amount} total`;
            console.log('Processing individual payment:', {
              participantId,
              name: participant.name,
              amount: amountPerParticipant,
              paymentMethodId: participant.defaultPaymentMethodId
            });
            const result = await processPayment(
              participantId,
              participant.defaultPaymentMethodId,
              amountPerParticipant,
              merchantName,
              participant.name,
              splitInfo,
              groupTransactionId
            );

            // Update participant's pledged amount
            const newPledgeAmount = currentPledgedAmount - amountPerParticipant;
            await get().updatePledge(participantId, newPledgeAmount);

            return {
              participantId,
              success: true,
              paymentIntent: result,
            };
          } catch (error) {
            console.error(`Payment failed for ${participant.name}:`, error);
            return {
              participantId,
              success: false,
              error,
            };
          }
        })
      );

      // Check if any payments failed
      const failedPayments = paymentResults.filter(
        (result) => result && !result.success
      );

      if (failedPayments.length > 0) {
        // In a production app, we would need to handle refunds here
        const failedNames = failedPayments
          .map(p => {
            const participant = state.participants.find(part => part.id === p?.participantId);
            return participant?.name;
          })
          .filter(Boolean)
          .join(', ');
        throw new Error(`Payments failed for: ${failedNames}`);
      }

      // All payments successful, create transaction record
      const transaction = {
        groupTransactionId,
        merchantName,
        totalAmount: amount,
        participantPayments: paymentResults.map(result => ({
          participant: result?.participantId,
          amount: amountPerParticipant,
          paymentIntentId: result?.paymentIntent?.paymentIntent?.id,
          status: 'succeeded'
        })).filter(payment => payment.participant && payment.paymentIntentId), // Filter out any null participants or payment intents
        splitInfo: JSON.stringify({
          type: 'equal',
          totalAmount: amount,
          participantCount: selectedParticipantIds.length,
          amountPerParticipant
        }),
        status: 'success'
      };

      try {
        console.log('Creating transaction:', transaction);
        const response = await axios.post(`${API_URL}/api/transactions`, transaction);
        if (!response.data) {
          throw new Error('Failed to create transaction record');
        }
        await get().fetchTransactions();
      } catch (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        throw new Error('Failed to save transaction. Please contact support.');
      }
    } catch (error) {
      console.error('Transaction processing failed:', error);
      throw error;
    }
  },

  fetchTransactions: async () => {
    try {
      const response = await axios.get<Transaction[]>(`${API_URL}/api/transactions`);
      console.log('Fetched transactions:', response.data);
      set({ transactions: response.data });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  },

  getTransactionById: async (id: string) => {
    try {
      const response = await axios.get<Transaction>(`${API_URL}/api/transactions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      throw error;
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/transactions/${id}`);
      
      // Remove from store
      set(state => ({
        transactions: state.transactions.filter(t => t._id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  },
}));