import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { PaymentIntent } from '../types/types';

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

const API_URL = 'http://localhost:3001'; // Local development backend URL

export const processPayment = async (
  participantId: string,
  paymentMethodId: string,
  amount: number,
  merchantName: string,
  participantName: string,
  splitInfo: string,
  groupTransactionId: string
): Promise<any> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));

  const requestData = {
    paymentMethodId,
    amount,
    merchantName,
    participantName,
    splitInfo,
    groupTransactionId
  };

  console.log('Sending payment request:', {
    url: `${API_URL}/api/participants/${participantId}/process-payment`,
    data: requestData
  });

  try {
    const response = await axios.post(
      `${API_URL}/api/participants/${participantId}/process-payment`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Payment response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};