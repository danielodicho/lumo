import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as participantController from './controllers/participant';
import * as transactionController from './controllers/transaction';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Participant Routes
app.get('/api/participants', participantController.getAllParticipants);
app.post('/api/participants', participantController.createParticipant);
app.post('/api/participants/:participantId/payment-method', participantController.addPaymentMethod);
app.post('/api/participants/:participantId/process-payment', participantController.processPayment);
app.delete('/api/participants/:id', participantController.deleteParticipant);
app.patch('/api/participants/:id/pledge', participantController.updatePledge);

// Transaction Routes
app.post('/api/transactions', transactionController.createTransaction);
app.get('/api/transactions', transactionController.getTransactions);
app.get('/api/transactions/:id', transactionController.getTransactionById);
app.put('/api/transactions/status', transactionController.updateTransactionStatus);
app.delete('/api/transactions/:id', transactionController.deleteTransaction);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
