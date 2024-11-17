import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export const ParticipantList: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { 
    participants, 
    addParticipant, 
    removeParticipant, 
    fetchParticipants, 
    selectedParticipants,
    toggleParticipantSelection 
  } = useStore();
  const [newName, setNewName] = React.useState('');
  const [newPledge, setNewPledge] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cardComplete, setCardComplete] = React.useState(false);


  // Fetch participants on mount
  React.useEffect(() => {
    let mounted = true;

    const loadParticipants = async () => {
      try {
        await fetchParticipants();
        if (!mounted) return;
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to fetch participants:', err);
        setError('Failed to load participants. Please refresh the page.');
      }
    };

    loadParticipants();

    return () => {
      mounted = false;
    };
  }, [fetchParticipants]);

  const handleCardChange = React.useCallback((event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      console.error('Stripe not initialized');
      return;
    }

    if (!newName || !newPledge) {
      setError('Please fill in all fields');
      return;
    }

    if (!cardComplete) {
      setError('Please enter complete card details');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      await addParticipant(newName, Number(newPledge), paymentMethod.id);
      
      // Clear form
      setNewName('');
      setNewPledge('');
      setCardComplete(false);
      cardElement.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant. Please try again.');
      console.error('Error adding participant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Participants</h2>
      
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded-md border border-gray-300 shadow-sm px-4 py-2"
            disabled={isLoading}
          />
          <input
            type="number"
            value={newPledge}
            onChange={(e) => setNewPledge(e.target.value)}
            placeholder="Pledge amount"
            className="w-32 rounded-md border border-gray-300 shadow-sm px-4 py-2"
            disabled={isLoading}
          />
        </div>
        
        <div className="rounded-md border border-gray-300 p-4">
          <CardElement 
            onChange={handleCardChange}
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !stripe || !elements || !cardComplete}
        >
          <UserPlus size={20} />
          {isLoading ? 'Adding...' : 'Add Participant'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}
      </form>

      <div className="space-y-4">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`flex items-center justify-between p-4 rounded-md cursor-pointer ${
              selectedParticipants.has(participant.id) ? 'bg-blue-50' : 'bg-gray-50'
            }`}
            onClick={() => toggleParticipantSelection(participant.id)}
          >
            <div className="space-y-1">
              <div className="font-medium">{participant.name}</div>
              <div className="text-sm text-gray-500">
                Pledged: ${participant.pledgedAmount}
              </div>
              {participant.card && (
                <div className="text-sm text-gray-500">
                  Card: {participant.card.brand} •••• {participant.card.last4}
                  <span className="ml-2">
                    Expires: {participant.card.expMonth}/{participant.card.expYear}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeParticipant(participant.id);
              }}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};