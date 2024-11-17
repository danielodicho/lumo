import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export const listCustomers = async () => {
  return await stripe.customers.list({
    expand: ['data.default_payment_method'],
  });
};

export const createCustomer = async (
  name: string,
  pledgedAmount: number,
  paymentMethodId?: string | null
) => {
  try {
    console.log('Creating Stripe customer:', { name, pledgedAmount, paymentMethodId });
    
    // Create customer
    const customer = await stripe.customers.create({
      name,
      metadata: {
        pledgedAmount: pledgedAmount.toString(),
      },
    });
    console.log('Stripe customer created:', customer.id);

    // Attach payment method if provided
    if (paymentMethodId) {
      try {
        console.log('Attaching payment method:', { customerId: customer.id, paymentMethodId });
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });
        console.log('Payment method attached successfully');

        // Set as default payment method
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
        console.log('Default payment method set successfully');
      } catch (error) {
        console.error('Failed to attach payment method:', error);
        // Clean up the customer if we fail to attach the payment method
        await stripe.customers.del(customer.id);
        throw error;
      }
    }

    return customer;
  } catch (error) {
    console.error('Failed to create customer:', error);
    throw error;
  }
};

export const updateCustomer = async (
  customerId: string,
  pledgedAmount: number
) => {
  return await stripe.customers.update(customerId, {
    metadata: {
      pledgedAmount: pledgedAmount.toString(),
    },
  });
};

export const deleteCustomer = async (customerId: string) => {
  return await stripe.customers.del(customerId);
};

export const createPaymentIntent = async (
  customerId: string,
  paymentMethodId: string,
  amount: number,
  merchantName: string,
  participantName: string,
  splitInfo: string,
  groupTransactionId: string
) => {
  try {
    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    console.log('Creating payment intent:', {
      originalAmount: amount,
      amountInCents,
      customerId,
      paymentMethodId,
      merchantName
    });

    if (amountInCents < 50) { // 50 cents minimum
      throw new Error(`Amount (${amountInCents} cents) is below Stripe's minimum of 50 cents`);
    }

    return await stripe.paymentIntents.create({
      amount: amountInCents, // Use the converted amount
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Payment to ${merchantName} (Split payment)`,
      metadata: {
        merchantName,
        participantName,
        splitInfo,
        type: 'lumo_split_payment',
        groupTransactionId
      },
      statement_descriptor: 'LUMO SPLIT PAY',
      statement_descriptor_suffix: merchantName.substring(0, 22)
    });
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    throw error;
  }
};

export const getPaymentMethodDetails = async (paymentMethodId: string) => {
  try {
    console.log('Retrieving payment method details:', paymentMethodId);
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    console.log('Payment method details retrieved:', {
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4
    });
    return {
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
      expMonth: paymentMethod.card?.exp_month,
      expYear: paymentMethod.card?.exp_year,
    };
  } catch (error) {
    console.error('Failed to get payment method details:', error);
    throw error;
  }
};

export const attachPaymentMethod = async (
  customerId: string, 
  paymentMethodId: string
): Promise<string> => {
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    default_payment_method: paymentMethodId,
  } as Stripe.CustomerUpdateParams);

  return paymentMethodId;
};