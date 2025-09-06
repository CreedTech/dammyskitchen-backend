import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function sendWhatsApp({
  orderId,
  customer,
  amount,
  to, // 👈 pass the target number dynamically
}) {
  try {
    const message = `
🛒 New Order Alert!

Order ID: ${orderId}
Customer: ${customer}
Amount: £${amount}
Date: ${new Date().toLocaleString()}
`;

    await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio sandbox sender
      to, // 👈 now we send to whichever number we pass in
      body: message,
    });

    console.log(`✅ WhatsApp sent to ${to}: ${orderId}`);
  } catch (error) {
    console.error('❌ WhatsApp send error:', error.message);
  }
}
