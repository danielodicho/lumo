import { Request, Response } from 'express';
import Participant from '../models/Participant';
import Transaction from '../models/Transaction'; // Import Transaction model
import * as stripeService from '../services/stripe';

export const getAllParticipants = async (req: Request, res: Response) => {
  try {
    const participants = await Participant.find();
    
    // Transform _id to id in the response
    const transformedParticipants = participants.map(p => ({
      id: p._id.toString(),
      name: p.name,
      pledgedAmount: p.pledgedAmount,
      stripeCustomerId: p.stripeCustomerId,
      defaultPaymentMethodId: p.defaultPaymentMethodId,
      // Add other fields as needed
    }));

    // Fetch card details for each participant
    const participantsWithCards = await Promise.all(
      transformedParticipants.map(async (participant) => {
        if (participant.defaultPaymentMethodId) {
          try {
            const card = await stripeService.getPaymentMethodDetails(participant.defaultPaymentMethodId);
            return {
              ...participant,
              card,
            };
          } catch (error) {
            console.error(`Failed to fetch card details for participant ${participant.id}:`, error);
            return participant;
          }
        }
        return participant;
      })
    );

    res.json(participantsWithCards);
  } catch (error) {
    console.error('Failed to get participants:', error);
    res.status(500).json({ 
      error: 'Failed to get participants',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteParticipant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Delete the participant
    await participant.deleteOne();
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete participant:', error);
    res.status(500).json({
      error: 'Failed to delete participant',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createParticipant = async (req: Request, res: Response) => {
  try {
    console.log('Received create participant request:', req.body);
    const { name, pledgedAmount, paymentMethodId } = req.body;

    if (!name || !pledgedAmount) {
      console.error('Missing required fields:', { name, pledgedAmount });
      return res.status(400).json({ error: 'Name and pledged amount are required' });
    }

    if (!paymentMethodId) {
      console.error('Missing payment method ID');
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    let customer;
    try {
      customer = await stripeService.createCustomer(name, pledgedAmount, paymentMethodId);
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      return res.status(400).json({ 
        error: 'Failed to create Stripe customer',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      });
    }

    let paymentMethod;
    try {
      paymentMethod = await stripeService.getPaymentMethodDetails(paymentMethodId);
    } catch (stripeError) {
      console.error('Failed to get payment method details:', stripeError);
      // Clean up the customer since we failed
      if (customer) {
        await stripeService.deleteCustomer(customer.id).catch(err => {
          console.error('Failed to clean up customer after payment method error:', err);
        });
      }
      return res.status(400).json({ 
        error: 'Failed to get payment method details',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      });
    }

    try {
      const participant = await Participant.create({
        name,
        pledgedAmount,
        stripeCustomerId: customer.id,
        defaultPaymentMethodId: paymentMethodId
      });

      const transformedParticipant = {
        id: participant._id.toString(),
        name: participant.name,
        pledgedAmount: participant.pledgedAmount,
        stripeCustomerId: participant.stripeCustomerId,
        defaultPaymentMethodId: participant.defaultPaymentMethodId,
        card: paymentMethod
      };

      console.log('Participant created successfully:', transformedParticipant);
      res.status(201).json(transformedParticipant);
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Clean up the Stripe customer since DB operation failed
      if (customer) {
        await stripeService.deleteCustomer(customer.id).catch(err => {
          console.error('Failed to clean up customer after database error:', err);
        });
      }
      return res.status(500).json({ 
        error: 'Failed to create participant in database',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in createParticipant:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.params;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      console.error('Missing payment method ID');
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    console.log('Finding participant:', participantId);
    const participant = await Participant.findById(participantId);
    if (!participant) {
      console.error('Participant not found:', participantId);
      return res.status(404).json({ error: 'Participant not found' });
    }

    console.log('Attaching payment method:', paymentMethodId);
    const attachedPaymentMethodId = await stripeService.attachPaymentMethod(
      participant.stripeCustomerId,
      paymentMethodId
    );
    console.log('Payment method attached:', attachedPaymentMethodId);

    participant.defaultPaymentMethodId = attachedPaymentMethodId;
    await participant.save();
    console.log('Participant updated with payment method');

    res.json(participant);
  } catch (error) {
    console.error('Failed to add payment method:', error);
    res.status(500).json({ 
      error: 'Failed to add payment method',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const processPayment = async (req: Request, res: Response) => {
  // Log the entire request body at the start
  console.log('=== Payment Request Start ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request params:', req.params);
  console.log('=== Payment Request End ===');

  try {
    const { participantId } = req.params;
    const { amount, merchantName, participantName, splitInfo, groupTransactionId } = req.body;

    // Log the raw amount from request body
    console.log('Raw payment request:', {
      amount: req.body.amount,
      amountType: typeof req.body.amount,
      parsedAmount: amount,
      parsedAmountType: typeof amount
    });

    // Ensure amount is a number
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount)) {
      console.error('Invalid amount format:', amount);
      return res.status(400).json({ error: 'Invalid amount format' });
    }

    // Check for minimum amount ($0.50)
    if (paymentAmount < 0.50) {
      console.error('Amount below minimum:', paymentAmount);
      return res.status(400).json({ error: 'Amount must be at least $0.50 USD' });
    }

    console.log('Finding participant:', participantId);
    const participant = await Participant.findById(participantId);
    if (!participant) {
      console.error('Participant not found:', participantId);
      return res.status(404).json({ error: 'Participant not found' });
    }

    if (!participant.defaultPaymentMethodId) {
      console.error('No payment method found for participant:', participantId);
      return res.status(400).json({ error: 'No payment method found' });
    }

    // Log the exact values being compared
    console.log('Checking funds:', {
      pledgedAmount: participant.pledgedAmount,
      pledgedAmountType: typeof participant.pledgedAmount,
      requiredAmount: paymentAmount,
      requiredAmountType: typeof paymentAmount,
      hasEnoughFunds: participant.pledgedAmount >= paymentAmount
    });

    // Check if participant has sufficient funds
    if (participant.pledgedAmount < paymentAmount) {
      console.error('Insufficient funds:', {
        participantId,
        required: paymentAmount,
        available: participant.pledgedAmount
      });
      return res.status(400).json({ 
        error: 'Insufficient funds',
        details: `Required: $${paymentAmount.toFixed(2)}, Available: $${participant.pledgedAmount.toFixed(2)}`
      });
    }

    console.log('Processing payment:', { 
      paymentAmount, 
      participantId, 
      merchantName,
      stripeCustomerId: participant.stripeCustomerId,
      paymentMethodId: participant.defaultPaymentMethodId
    });
    
    try {
      const paymentIntent = await stripeService.createPaymentIntent(
        participant.stripeCustomerId,
        participant.defaultPaymentMethodId,
        paymentAmount,
        merchantName,
        participantName || participant.name || 'Unknown Participant',
        splitInfo,
        groupTransactionId
      );
      console.log('Payment processed successfully:', paymentIntent.id);

      // DO NOT update pledged amount here - it will be updated after transaction creation
      res.json({
        success: true,
        paymentIntent,
        remainingBalance: participant.pledgedAmount - paymentAmount // Show expected remaining balance
      });
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  } catch (error) {
    console.error('Payment request failed:', error);
    res.status(500).json({ 
      error: 'Payment processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updatePledge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount && amount !== 0) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    participant.pledgedAmount = amount;
    await participant.save();

    res.json(participant);
  } catch (error) {
    console.error('Failed to update pledge:', error);
    res.status(500).json({ 
      error: 'Failed to update pledge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const transaction = req.body;
    // Store transaction in your database here
    // For now, we'll just return success since the frontend is handling the state
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Failed to create transaction:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    // Retrieve transactions from your database here
    // For now, return empty array since the frontend is handling the state
    res.json([]);
  } catch (error) {
    console.error('Failed to get transactions:', error);
    res.status(500).json({ 
      error: 'Failed to get transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};