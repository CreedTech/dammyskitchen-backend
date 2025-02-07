import { SMTPClient } from 'emailjs';
import Quote from '../models/quoteModel.js';

// SMTP Client Configuration
const client = new SMTPClient({
  user: process.env.EMAIL_USER, // Your email address
  password: process.env.EMAIL_PASS, // Your email password or app-specific password
  host: 'smtp.gmail.com', // e.g., 'smtp.gmail.com' for Gmail
  ssl: true, // Use SSL for secure connections
});

export const requestQuote = async (req, res) => {
  console.log(req.body);
  const { name, email, phone, message } = req.body;
  console.log(req.body.name);
  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required fields.',
    });
  }

  try {
    // Sending the email
    await client.sendAsync({
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
      from: `${name} <${email}>`, // Sender's email address
      to: process.env.EMAIL_USER, // Your email to receive the messages
      subject: 'New Quote Request',
    });

    // Save data to a database if needed
    // Example: Save to MongoDB or another database
    const quote = new Quote({ name, email, phone, message });
    await quote.save();

    res
      .status(200)
      .json({ success: true, message: 'Quote request sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to send quote request' });
  }
};
