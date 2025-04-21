import nodemailer from 'nodemailer';

const sendNotification = async ({ to, subject, message }) => {
  console.log('Preparing to send email to:', to);

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Order Notifications" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message,
    });

    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
};

export default sendNotification;
