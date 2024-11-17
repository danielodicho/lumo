import { Request, Response } from 'express';
import Transaction, { ITransaction, IParticipantPayment } from '../models/Transaction';
import mongoose from 'mongoose';
import Participant from '../models/Participant';

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { groupTransactionId, merchantName, totalAmount, participantPayments, splitInfo, status } = req.body;
    
    console.log('Creating transaction with data:', JSON.stringify({
      groupTransactionId,
      merchantName,
      totalAmount,
      participantPayments,
      splitInfo,
      status
    }, null, 2));
    
    // Only save transactions that were successful
    if (status !== 'success') {
      console.log('Skipping failed transaction:', { groupTransactionId, status });
      return res.status(400).json({ error: 'Cannot save failed transactions' });
    }

    // Create the transaction
    const transaction = new Transaction({
      groupTransactionId,
      merchantName,
      totalAmount,
      participantPayments: participantPayments.map((payment: IParticipantPayment) => ({
          ...payment,
          participant: new mongoose.Types.ObjectId(payment.participant)
        })),
      splitInfo,
      status
    });

    // Save transaction
    await transaction.save();

    // Update participant pledged amounts
    for (const payment of participantPayments) {
      const participant = await Participant.findById(payment.participant);
      if (!participant) {
        throw new Error(`Participant ${payment.participant} not found`);
      }
      
      participant.pledgedAmount -= payment.amount;
      await participant.save();
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find()
      .populate('participantPayments.participant', 'name')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const transaction = await Transaction.findOne({ groupTransactionId: req.params.id })
      .populate('participantPayments.participant', 'name');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateTransactionStatus = async (req: Request, res: Response) => {
  try {
    const { groupTransactionId, participantId, paymentIntentId, status } = req.body;
    
    const transaction = await Transaction.findOne({ groupTransactionId });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const payment = transaction.participantPayments.find(
      p => p.participant.toString() === participantId && p.paymentIntentId === paymentIntentId
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found in transaction' });
    }

    payment.status = status;
    await transaction.save();

    res.json(transaction);
  } catch (error) {
    console.error('Failed to update transaction status:', error);
    res.status(500).json({ 
      error: 'Failed to update transaction status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByIdAndDelete(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Transform the response to match our frontend interface
    const transformedTransaction = {
      _id: transaction._id.toString(),
      groupTransactionId: transaction.groupTransactionId,
      merchantName: transaction.merchantName,
      totalAmount: transaction.totalAmount,
      participantPayments: transaction.participantPayments,
      splitInfo: transaction.splitInfo,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
    
    res.json({ message: 'Transaction deleted successfully', transaction: transformedTransaction });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    res.status(500).json({ 
      error: 'Failed to delete transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};