import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { transactions, fetchTransactions, deleteTransaction } = useStore();

  useEffect(() => {
    fetchTransactions().catch(console.error);
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      // You might want to show a toast notification here
    }
  };

  const getParticipantName = (participant: any): string => {
    if (!participant) return 'Unknown';
    if (typeof participant === 'string') return participant;
    if (typeof participant === 'object' && participant.name) return participant.name;
    if (typeof participant === 'object' && participant._id) return participant._id;
    return 'Unknown';
  };

  if (transactions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Transaction History</h2>
      <div className="space-y-4">
        {transactions.map((transaction) => {
          console.log('Rendering transaction:', transaction);
          return (
            <div
              key={transaction.groupTransactionId}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{transaction.merchantName}</h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <p className="font-semibold">${transaction.totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{transaction.splitInfo}</p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('Deleting transaction with id:', transaction._id);
                      handleDelete(transaction._id);
                    }}
                    className="text-red-500 hover:text-red-600 p-1"
                    title="Delete transaction"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {transaction.participantPayments.map((payment) => (
                  <div
                    key={payment.paymentIntentId}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{getParticipantName(payment.participant)}</span>
                    <div className="flex items-center space-x-2">
                      <span>${payment.amount.toFixed(2)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === 'succeeded' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};