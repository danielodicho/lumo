import React from 'react';
import { CreditCard } from 'lucide-react';
import { useStore } from '../store/useStore';

export const VirtualCard: React.FC = () => {
  const { virtualCard } = useStore();

  return (
    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
      <div className="flex justify-between items-start mb-8">
        <CreditCard size={32} />
        <span className="font-mono text-lg">Virtual Card</span>
      </div>
      
      <div className="mb-8">
        <div className="font-mono text-2xl tracking-wider">
          •••• •••• •••• {virtualCard.lastFour}
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <div className="text-sm opacity-75">Available Balance</div>
          <div className="text-2xl font-bold">
            ${virtualCard.balance.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};