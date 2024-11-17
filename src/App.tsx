import React from 'react';
import { ParticipantList } from './components/ParticipantList';
import { VirtualCard } from './components/VirtualCard';
import { TransactionForm } from './components/TransactionForm';
import { TransactionHistory } from './components/TransactionHistory';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Shared Payment System
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
  );
}

export default App;