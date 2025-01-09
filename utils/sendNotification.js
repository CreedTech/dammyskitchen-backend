import nodemailer from 'nodemailer';

const sendNotification = async ({ to, subject, message }) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
      },
    from: process.env.EMAIL_USER
  });

  await transporter.sendMail({
    from: `"Order Notifications" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: message,
  });
};

export default sendNotification;
