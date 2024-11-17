import { loadStripe } from '@stripe/stripe-js';
import { PaymentIntent } from '../types';

// Initialize Stripe with test key
const stripePromise = loadStripe('pk_test_your_key');

// Simulate different payment scenarios
const SIMULATION_SCENARIOS = {
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  CARD_DECLINED: 'card_declined',
  NETWORK_ERROR: 'network_error',
  SUCCESS: 'success',
};

const getRandomScenario = () => {
  const scenarios = Object.values(SIMULATION_SCENARIOS);
  const weights = [0.05, 0.03, 0.02, 0.9]; // 90% success rate
  const random = Math.random();
  let sum = 0;
  
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random <= sum) return scenarios[i];
  }
  
  return SIMULATION_SCENARIOS.SUCCESS;
};

export const processPayment = async (
  amount: number,
  participantId: string
): Promise<PaymentIntent> => {
  // Simulate network delay (500-1500ms)
  await new Promise(resolve => 
    setTimeout(resolve, 500 + Math.random() * 1000)
  );

  const scenario = getRandomScenario();
  
  // Simulate different payment scenarios
  switch (scenario) {
    case SIMULATION_SCENARIOS.INSUFFICIENT_FUNDS:
      throw new Error('Insufficient funds');
      
    case SIMULATION_SCENARIOS.CARD_DECLINED:
      throw new Error('Card declined');
      
    case SIMULATION_SCENARIOS.NETWORK_ERROR:
      throw new Error('Network error');
      
    case SIMULATION_SCENARIOS.SUCCESS:
    default:
      return {
        id: crypto.randomUUID(),
        status: 'succeeded',
        amount,
        participantId,
        error: null,
      };
  }
};