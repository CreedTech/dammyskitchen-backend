import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import Stripe from 'stripe';
import razorpay from 'razorpay';
import webhookLogModel from '../models/webhookLogModel.js'; // For saving webhook data
import sendNotification from '../utils/sendNotification.js';

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
    console.log(address);

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

    // await userModel.findByIdAndUpdate(userId, { cartData: {} });
    // const user = await userModel.findById(userId);
    try {
      // Send email to the customer (Email type is 'orderPlaced')
      await sendNotification({
        to: address.email,
        subject: 'Order Placed',
        message: '', // The content is generated in the sendNotification function
        orderData: newOrder,
        emailType: 'orderPlaced', // Specify the email type
        isCustomer: true, // This is for customer notification
      });

      // Send email to the business owner (Email type is 'orderPlaced')
      await sendNotification({
        to: 'kitchendammys@gmail.com',
        subject: 'New Order Received',
        message: '', // The content is generated in the sendNotification function
        orderData: newOrder,
        emailType: 'orderPlaced', // Specify the email type
        isCustomer: false, // This is for business owner notification
      });

      // await sendNotification({
      //   to: address.email,
      //   subject: 'Order Placed',
      //   message: `Hello ${address.firstName} ${address.lastName}, Your order has been placed successfully. Your order ID is ${newOrder._id}.`,
      // });
      console.log('Order saved:', newOrder._id);
      console.log('Sending email to:', address.email);
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr.message);
    }

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

    if (!userId || !items || items.length === 0 || !amount || !address) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid order data.' });
    }

    // Map `items` to your schema
    const orderItems = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      image: item.image || [],
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      proteins: item.proteins || [],
      spiceLevel: item.spiceLevel,
      totalPrice: item.totalPrice,
    }));

    const orderData = {
      userId,
      items: orderItems,
      address,
      amount,
      paymentMethod: 'Stripe',
      payment: false,
      status: 'Order Placed',
      date: Date.now(),
    };

    // Save order to database
    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // Prepare Stripe line items
    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.totalPrice * 100, // Stripe expects amount in cents
      },
      quantity: item.quantity,
    }));

    // Add delivery charge
    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: 'Delivery Charges',
        },
        unit_amount: deliveryCharge,
      },
      quantity: 1,
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: 'payment',
      metadata: {
        sessionRef: 'from-frontend',
        userId,
        address: JSON.stringify(address),
        amount,
        itemsRef: newOrder._id.toString(), // Store order ID for future reference
      },
      payment_intent_data: {
        metadata: {
          userId,
          itemsRef: newOrder._id.toString(),
          address: JSON.stringify(address),
          amount,
        },
      },
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
const stripeWebhook = async (req, res) => {
  let event;

  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_ENDPOINT_SECRET;

    // Verify the signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Save webhook event to database
  try {
    await webhookLogModel.create({
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object,
      receivedAt: new Date(),
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError.message);
  }

  const { type } = event;

  try {
    if (type === 'checkout.session.completed') {
      const session = event.data.object;

      const orderId = session.metadata.itemsRef;
      const paymentStatus = session.payment_status;
      const userId = session.metadata.userId;
      console.log(session.metadata);

      // Update order in database
      const order = await orderModel.findById(orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        return res.status(404).send('Order not found');
      }

      order.payment = paymentStatus === 'paid';
      order.status = order.payment ? 'Paid' : 'Payment Failed';
      order.paymentMethod = 'Stripe';

      await order.save();

      // Notify user
      const user = await userModel.findById(userId);
      if (user) {
        const message = order.payment
          ? `Your payment for order ${orderId} was successful!`
          : `Your payment for order ${orderId} failed. Please try again.`;

        await sendNotification({
          to: user.email,
          subject: 'Order Payment Update',
          message,
          orderData: order,
          emailType: order.payment ? 'paymentSuccess' : 'paymentFailure',
          isCustomer: true,
        });
      }
    } else if (type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);

      const orderId = paymentIntent.metadata.itemsRef;
      const order = await orderModel.findById(orderId);

      if (order) {
        order.payment = true;
        order.status = 'Paid';
        await order.save();

        // Optional: Send payment success notification to the customer
        const user = await userModel.findById(paymentIntent.metadata.userId);
        if (user) {
          await sendNotification({
            to: user.email,
            subject: 'Payment Successful',
            message: `Your payment for order ${orderId} was successful.`,
            orderData: order,
            emailType: 'paymentSuccess',
            isCustomer: true,
          });
        }
      }
    } else if (type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const failureReason =
        paymentIntent.last_payment_error?.message || 'Unknown error';
      console.error('PaymentIntent failed:', failureReason);

      // Optional: Notify user of payment failure
      const user = await userModel.findById(paymentIntent.metadata.userId);
      if (user) {
        const order = await orderModel.findById(
          paymentIntent.metadata.itemsRef
        );
        if (order) {
          await sendNotification({
            to: user.email, // Customer email
            subject: 'Payment Failed',
            orderData: order,
            emailType: 'paymentFailure', // Payment failure email type
            isCustomer: true, // Send to the customer
          });

          await sendNotification({
            to: 'kitchendammys@gmail.com', // Business owner email
            subject: 'Payment Failure Notification',
            orderData: order,
            emailType: 'paymentFailure', // Payment failure email type
            isCustomer: false, // Send to the business owner
          });
        }
      }
    } else if (type === 'charge.refunded') {
      const charge = event.data.object;
      const orderId = charge.metadata?.itemsRef;

      if (orderId) {
        const order = await orderModel.findById(orderId);
        if (order) {
          order.status = 'Refunded';
          await order.save();
        }

        // Notify user about the refund
        const user = await userModel.findById(charge.metadata.userId);
        if (user) {
          await sendNotification({
            to: user.email, // Customer email
            subject: 'Refund Processed',
            message: `Your refund for order ${orderId} has been processed successfully.`,
            orderData: { _id: orderId }, // Minimal order data
            emailType: 'refundProcessed',
            isCustomer: true, // Send to the customer
          });

          // Optionally notify the business owner
          await sendNotification({
            to: 'kitchendammys@gmail.com', // Business owner email
            subject: 'Refund Processed Notification',
            message: `Refund processed for order ${orderId}.`,
            orderData: { _id: orderId },
            emailType: 'refundProcessed',
            isCustomer: false, // Send to the business owner
          });
        }
      }
    } else {
      console.log(`Unhandled event type ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).send('Webhook handling failed');
  }
};

// const stripeWebhook = async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers['stripe-signature'];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     // Verify the signature
//     event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
//   } catch (err) {
//     console.error('Webhook signature verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Save webhook event to database
//   try {
//     await webhookLogModel.create({
//       eventId: event.id,
//       eventType: event.type,
//       payload: event.data.object,
//       receivedAt: new Date(),
//     });
//   } catch (logError) {
//     console.error('Failed to log webhook event:', logError.message);
//   }

//   const { type } = event;

//   try {
//     if (type === 'checkout.session.completed') {
//       const session = event.data.object;

//       const orderId = session.metadata.itemsRef;
//       const paymentStatus = session.payment_status;
//       const userId = session.metadata.userId;

//       // Update order in database
//       const order = await orderModel.findById(orderId);
//       if (!order) {
//         console.error('Order not found:', orderId);
//         return res.status(404).send('Order not found');
//       }

//       order.payment = paymentStatus === 'paid';
//       order.status = order.payment ? 'Paid' : 'Payment Failed';
//       order.paymentMethod = 'Stripe';

//       await order.save();

//       // Notify user
//       const user = await userModel.findById(userId);
//       if (user) {
//         const message = order.payment
//           ? `Your payment for order ${orderId} was successful!`
//           : `Your payment for order ${orderId} failed. Please try again.`;

//         sendNotification({
//           to: user.email,
//           subject: 'Order Payment Update',
//           message,
//         });
//       }
//     } else if (type === 'payment_intent.succeeded') {
//       // Handle successful payments if additional logic is needed
//       const paymentIntent = event.data.object;
//       console.log('PaymentIntent was successful:', paymentIntent.id);
//     } else if (type === 'payment_intent.payment_failed') {
//       const paymentIntent = event.data.object;
//       const failureReason =
//         paymentIntent.last_payment_error?.message || 'Unknown error';
//       console.error('PaymentIntent failed:', failureReason);

//       // Optional: Notify user of payment failure
//       const user = await userModel.findById(session.metadata.userId);
//       if (user) {
//         // sendNotification({
//         //   to: user.email,
//         //   subject: 'Payment Failed',
//         //   message: `Your payment for order ${order} failed. Reason: ${failureReason}. Please try again.`,
//         // });
//         await sendNotification({
//           to: user.email, // Customer email
//           subject: 'Payment Failed',
//           orderData: orderData,
//           emailType: 'paymentFailure', // Payment failure email type
//           isCustomer: true, // Send to the customer
//         });

//         await sendNotification({
//           to: 'kitchendammys@gmail.com', // Business owner email
//           subject: 'Payment Failure Notification',
//           orderData: orderData,
//           emailType: 'paymentFailure', // Payment failure email type
//           isCustomer: false, // Send to the business owner
//         });
//       }
//     } else if (type === 'charge.refunded') {
//       const charge = event.data.object;
//       const orderId = charge.metadata?.itemsRef;

//       if (orderId) {
//         const order = await orderModel.findById(orderId);
//         if (order) {
//           order.status = 'Refunded';
//           await order.save();
//         }
//       }

//       // Optional: Notify user about the refund
//     } else {
//       console.log(`Unhandled event type ${type}`);
//     }

//     res.status(200).json({ received: true });
//   } catch (error) {
//     console.error('Webhook processing error:', error.message);
//     res.status(500).send('Webhook handling failed');
//   }
// };

const issueRefund = async (req, res) => {
  const { chargeId, orderId, reason } = req.body;

  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'Refunded') {
      return res
        .status(400)
        .json({ success: false, message: 'Order already refunded' });
    }

    // Refund via Stripe API
    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: reason || 'requested_by_customer',
    });

    // Update order status to 'Refunded'
    order.status = 'Refunded';
    await order.save();

    // Notify user
    // sendNotification({
    //   to: order.address.email,
    //   subject: 'Refund Processed',
    //   message: `Your refund for order ${orderId} has been processed successfully.`,
    // });
    await sendNotification({
      to: order.address.email, // Customer email
      subject: 'Refund Processed',
      orderData: orderData, // Order data containing the refund details
      emailType: 'refundProcessed', // Refund processed email type
      isCustomer: true, // Send to the customer
    });

    await sendNotification({
      to: 'kitchendammys@gmail.com', // Business owner email
      subject: 'Refund Processed Notification',
      orderData: orderData, // Order data containing the refund details
      emailType: 'refundProcessed', // Refund processed email type
      isCustomer: false, // Send to the business owner
    });

    res.json({ success: true, refund });
  } catch (error) {
    console.error('Refund error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
// const stripeWebhook = async (req, res) => {
//   console.log('Webhook payload:', req.body);
//   const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET; // Replace with your Stripe Webhook Signing Secret
//   const sig = req.headers['stripe-signature'];

//   let event;

//   try {
//     // Verify the webhook signature
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//   } catch (err) {
//     console.error('Webhook verification failed:', err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the checkout.session.completed event
//   switch (event.type) {
//     case 'checkout.session.completed':
//       const session = event.data.object;

//       // Check if payment is successful
//       if (session.payment_status === 'paid') {
//         const { userId, itemsRef, address, amount } = session.metadata;

//         try {
//           // Retrieve the order from the database using the itemsRef (orderId)
//           const order = await orderModel.findById(itemsRef);

//           if (!order) {
//             return res.status(404).send('Order not found');
//           }

//           // Update the order payment status to 'paid'
//           await orderModel.findByIdAndUpdate(itemsRef, { payment: true });

//           // Clear the user's cart data
//           await userModel.findByIdAndUpdate(userId, { cartData: {} });

//           // Optionally log the success
//           console.log(
//             `Order ${itemsRef} successfully paid and cart cleared for user ${userId}`
//           );

//           res.status(200).send('Payment processed successfully');
//         } catch (error) {
//           console.error(
//             'Error updating order or clearing cart:',
//             error.message
//           );
//           res.status(500).send('Internal Server Error');
//         }
//       } else {
//         // Handle unsuccessful payment (e.g., delete order or notify)
//         console.log(`Payment failed for session ${session.id}`);
//         const failedOrderId = session.metadata.itemsRef;

//         // If payment failed, delete the order from the database
//         await orderModel.findByIdAndDelete(failedOrderId);
//         res.status(200).send('Payment failed, order deleted');
//       }
//       break;

//     case 'checkout.session.async_payment_failed':
//       const failedSession = event.data.object;
//       const failedOrderId = failedSession.metadata.itemsRef;

//       // If payment failed asynchronously, delete the order from the database
//       await orderModel.findByIdAndDelete(failedOrderId);
//       res.status(200).send('Payment failed, order deleted');
//       break;

//     default:
//       console.warn(`Unhandled event type: ${event.type}`);
//   }

//   res.status(200).send('Webhook received');
// };

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
    const { completed } = req.body;

    const filter =
      completed === false ? { isCompleted: false } : { isCompleted: true };
    const orders = await orderModel.find(filter).sort({ date: -1 });
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

// Update order status from Admin Panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const updateData = { status };

    if (status === 'Delivered') {
      const order = await orderModel.findById(orderId);

      // For COD orders, set payment to true when delivered
      if (order.paymentMethod === 'COD') {
        updateData.payment = true;
      }

      // Mark as completed if delivered and payment is done
      if (order.payment || order.paymentMethod === 'COD') {
        updateData.isCompleted = true;
      }
    }

    await orderModel.findByIdAndUpdate(orderId, updateData);

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
  issueRefund,
};
