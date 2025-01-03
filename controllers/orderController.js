import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import Stripe from 'stripe';
import razorpay from 'razorpay';

// global variables
const currency = 'gbp';
const deliveryCharge = 0;

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Placing orders using COD Method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: 'COD',
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: 'Order Placed' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using Stripe Method
const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: 'Stripe',
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: 'Delivery Charges',
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: 'payment',
      metadata: {
        userId,
        address: JSON.stringify(address),
        amount,
        itemsRef: newOrder._id.toString(), // Store the order ID in metadata for later use
      },
    });
      
      console.log(session);

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Stripe
// const verifyStripe = async (req, res) => {
//   //   const { session_id } = req.body;
//   //   const { orderId, success, userId } = req.body;
//   const { session_id } = req.query; // Extract session_id from the query string

//   if (!session_id) {
//     return res.json({ success: false, message: 'Session ID is required' });
//   }

//   try {
//     // Retrieve the Checkout Session from Stripe
//     const session = await stripe.checkout.sessions.retrieve(session_id);

//     if (session.payment_status === 'paid') {
//       //   await orderModel.findByIdAndUpdate(orderId, { payment: true });
//       //   await userModel.findByIdAndUpdate(userId, { cartData: {} });
//       //   res.json({ success: true });
//       // Extract the metadata from the session (including orderId)
//       const { userId, itemsRef } = session.metadata;

//       // Retrieve the order from the database using the itemsRef (orderId)
//       const order = await orderModel.findById(itemsRef);

//       // If the order is not found, return an error
//       if (!order) {
//         return res.json({ success: false, message: 'Order not found' });
//       }

//       // Update the order payment status to 'paid'
//       await orderModel.findByIdAndUpdate(itemsRef, { payment: true });

//       // Clear the user's cart data
//       await userModel.findByIdAndUpdate(userId, { cartData: {} });

//       res.json({ success: true });
//     } else {
//     //   await orderModel.findByIdAndDelete(orderId);
//         //   res.json({ success: false });
//           // If payment failed or wasn't completed, delete the order
//       const { itemsRef } = session.metadata;  // Retrieve the order reference from metadata
//       const order = await orderModel.findById(itemsRef);

//       if (order) {
//         await orderModel.findByIdAndDelete(itemsRef);  // Delete the order from the database
//       }

//       res.json({ success: false, message: 'Payment unsuccessful. Order deleted.' });
   
//     }
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

const stripeWebhook = async (req, res) => {
    console.log('Webhook payload:', req.body);
    const endpointSecret = 'whsec_JmKmeR2z3k7QoNUwPVOokEJ9XJItcg14'; // Replace with your Stripe Webhook Signing Secret
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;

            // Check if payment is successful
            if (session.payment_status === 'paid') {
                const { userId, itemsRef, address, amount } = session.metadata;

                try {
                    // Retrieve the order from the database using the itemsRef (orderId)
                    const order = await orderModel.findById(itemsRef);

                    if (!order) {
                        return res.status(404).send('Order not found');
                    }

                    // Update the order payment status to 'paid'
                    await orderModel.findByIdAndUpdate(itemsRef, { payment: true });

                    // Clear the user's cart data
                    await userModel.findByIdAndUpdate(userId, { cartData: {} });

                    // Optionally log the success
                    console.log(`Order ${itemsRef} successfully paid and cart cleared for user ${userId}`);

                    res.status(200).send('Payment processed successfully');
                } catch (error) {
                    console.error('Error updating order or clearing cart:', error.message);
                    res.status(500).send('Internal Server Error');
                }
            } else {
                // Handle unsuccessful payment (e.g., delete order or notify)
                console.log(`Payment failed for session ${session.id}`);
                const failedOrderId = session.metadata.itemsRef;

                // If payment failed, delete the order from the database
                await orderModel.findByIdAndDelete(failedOrderId);
                res.status(200).send('Payment failed, order deleted');
            }
            break;

        case 'checkout.session.async_payment_failed':
            const failedSession = event.data.object;
            const failedOrderId = failedSession.metadata.itemsRef;

            // If payment failed asynchronously, delete the order from the database
            await orderModel.findByIdAndDelete(failedOrderId);
            res.status(200).send('Payment failed, order deleted');
            break;

        default:
            console.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook received');
};

  

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: 'Razorpay',
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    const options = {
      amount: amount * 100,
      currency: currency.toUpperCase(),
      receipt: newOrder._id.toString(),
    };

    await razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.json({ success: false, message: error });
      }
      res.json({ success: true, order });
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    const { userId, razorpay_order_id } = req.body;

    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (orderInfo.status === 'paid') {
      await orderModel.findByIdAndUpdate(orderInfo.receipt, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      res.json({ success: true, message: 'Payment Successful' });
    } else {
      res.json({ success: false, message: 'Payment Failed' });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// const stripeWebhook = async (req, res) => {
//   const endpointSecret = 'whsec_JmKmeR2z3k7QoNUwPVOokEJ9XJItcg14'; // Replace with Stripe Webhook Signing Secret
//   const sig = req.headers['stripe-signature'];

//   let event;

//   try {
//     // Verify the webhook signature
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//   } catch (err) {
//     console.error('Webhook verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle specific Stripe event
//   switch (event.type) {
//     case 'checkout.session.completed':
//       const session = event.data.object;

//       if (session.payment_status === 'paid') {
//         const { userId, amount, address, items } = session.metadata;

//         console.log(session.metadata);
//         // Save order to database
//         // const orderData = {
//         //   userId,
//         //   items: JSON.parse(items),
//         //   address: JSON.parse(address),
//         //   amount,
//         //   paymentMethod: 'Stripe',
//         //   payment: true,
//         //   date: Date.now(),
//         // };

//         // const newOrder = new orderModel(orderData);
//         // await newOrder.save();

//         // // Clear user's cart
//         // await userModel.findByIdAndUpdate(userId, { cartData: {} });
//       }
//       break;

//     default:
//       console.warn(`Unhandled event type: ${event.type}`);
//   }

//   res.status(200).send('Webhook received');
// };

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// User Order Data For Forntend
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// update order status from Admin Panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: 'Status Updated' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  verifyRazorpay,
//   verifyStripe,
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
  stripeWebhook,
};
