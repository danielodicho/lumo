import React from 'react';
import { Receipt, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

export const TransactionHistory: React.FC = () => {
  const { transactions, participants } = useStore();

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  const getStatusIcon = (status: string, error?: string | null) => {
    if (error) {
      return <AlertCircle size={16} className="text-orange-500" title={error} />;
    }
    
    switch (status) {
      case 'succeeded':
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
      
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={20} className="text-blue-500" />
                <span className="font-medium">{transaction.merchantName}</span>
                {getStatusIcon(transaction.status)}
              </div>
              <span className="text-sm text-gray-500">
                {format(transaction.date, 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            
            <div className="text-lg font-bold">
              ${transaction.totalAmount.toFixed(2)}
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-500">Split Details:</div>
              {transaction.splits.map((split, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(split.status, split.error)}
                    <span>{getParticipantName(split.participantId)}</span>
                  </div>
                  <span>${split.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {transactions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No transactions yet
          </div>
        )}
      </div>
    </div>
  );
};