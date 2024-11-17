import React from 'react';
import { DollarSign } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

export const TransactionForm: React.FC = () => {
  const { processTransaction, virtualCard } = useStore();
  const [merchant, setMerchant] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (merchant && amount && Number(amount) <= virtualCard.balance && !processing) {
      setProcessing(true);
      try {
        await processTransaction(merchant, Number(amount));
        toast.success('Transaction processed successfully!');
        setMerchant('');
        setAmount('');
      } catch (error) {
        toast.error('Failed to process transaction. Please try again.');
      } finally {
        setProcessing(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">New Transaction</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm px-4 py-2"
            placeholder="Enter merchant name"
            disabled={processing}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (from POS)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm px-4 py-2"
            placeholder="Enter transaction amount"
            disabled={processing}
          />
        </div>

        <button
          type="submit"
          disabled={Number(amount) > virtualCard.balance || processing}
          className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <DollarSign size={20} />
          {processing ? 'Processing...' : 'Process Transaction'}
        </button>
      </form>
    </div>
  );
};