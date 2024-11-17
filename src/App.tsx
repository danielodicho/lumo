import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ParticipantList } from './components/ParticipantList';
import { VirtualCard } from './components/VirtualCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionHistory } from './components/TransactionHistory';
import { Toaster } from 'react-hot-toast';

// Initialize Stripe
const stripeKey = "pk_test_51QM3DVAZ4cjfZyF9xgkoNVbQTcqnHDGIyKFqPCLy1hZ1oEgVYLMamYmBkPK5EBcTHLdTM3ev5rtdrFDFrl3foK82003AzraxXm";

if (!stripeKey) {
  throw new Error('Stripe publishable key is missing');
}

const stripePromise = loadStripe(stripeKey);

function App() {
  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-7xl font-bold text-amber-400 mb-8 tracking-wide drop-shadow-sm hover:text-amber-300 transition-colors">
            LUMO
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ParticipantList />
            <div className="space-y-6">
              <VirtualCard />
              <TransactionForm />
            </div>
          </div>
          
          <TransactionHistory />
        </div>
        <Toaster position="top-right" />
      </div>
    </Elements>
  );
}

export default App;