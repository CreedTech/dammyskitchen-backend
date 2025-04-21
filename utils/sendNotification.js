import nodemailer from 'nodemailer';

const sendNotification = async ({
  to,
  subject,
  message,
  orderData,
  emailType,
  isCustomer = true,
}) => {
  console.log('Preparing to send email to:', to);

  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.EMAIL_PASS,
    },
    from: 'no-reply@dammyskitchen.co.uk',
  });

  // Generate the HTML content for the order items
  const itemsHtml =
    orderData?.items
      ?.map(
        (item) => `
    <tr style="text-align:center;border-top:1px solid #eee;">
      <td><img src="${item.image[0]}" width="60" /></td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.spiceLevel}</td>
      <td>£${item.totalPrice}</td>
    </tr>
  `
      )
      .join('') || '';

  const orderHtml = `
    <h2>Order ID: ${orderData?._id}</h2>
    <p><strong>Total:</strong> £${orderData?.amount}</p>
<p><strong>Delivery Address:</strong> 
  ${orderData.address?.street || ''}, 
  ${orderData.address?.city || ''}, 
  ${orderData.address?.postcode || ''}
</p>
    <table cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f8f8f8;">
          <th>Image</th>
          <th>Item</th>
          <th>Quantity</th>
          <th>Spice</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  `;

  // Default content if emailType is not provided
  let htmlContent = '';

  if (emailType === 'orderPlaced') {
    // Order placed email content
    htmlContent = isCustomer
      ? `
      <h2>Hi ${orderData.address.firstName},</h2>
      <p>Thanks for ordering from <strong>Dammy's Kitchen</strong>!</p>
      <p>Here’s a summary of your order:</p>
      ${orderHtml}
      <p><strong>Bon appétit!<br>– Dammy's Kitchen</strong></p>
    `
      : `
      <h2>🍴 New Order Received!</h2>
     <p><strong>Customer:</strong> ${orderData.address.firstName} ${
          orderData.address.lastName
        } (${orderData.address.email})</p>

      <p><strong>Delivery Address:</strong> 
  ${orderData.address?.street || ''}, 
  ${orderData.address?.city || ''}, 
  ${orderData.address?.postcode || ''}
</p>

      ${orderHtml}
      <p>Head to your dashboard to start processing. 🚚</p>
    `;
  } else if (emailType === 'paymentSuccess') {
    // Payment success email content
    htmlContent = isCustomer
      ? `
      <h2>Payment Successful!</h2>
      <p>Thank you for your payment. Your order has been successfully processed.</p>
      <p><strong>Order ID:</strong> ${orderData._id}</p>
      <p><strong>Amount Paid:</strong> £${orderData.amount}</p>
      <p><strong>Delivery Address:</strong> 
  ${orderData.address?.street || ''}, 
  ${orderData.address?.city || ''}, 
  ${orderData.address?.postcode || ''}
</p>

    `
      : `
      <h2>Payment Success Notification</h2>
      <p><strong>Customer:</strong> ${orderData.address.firstName} ${orderData.address.lastName}</p>
      <p><strong>Order ID:</strong> ${orderData._id}</p>
      <p><strong>Amount Paid:</strong> £${orderData.amount}</p>
      <p>Head to your dashboard to process the payment.</p>
    `;
  } else if (emailType === 'paymentFailure') {
    // Payment failure email content
    htmlContent = isCustomer
      ? `
      <h2>Payment Failed</h2>
      <p>Unfortunately, your payment was not successful. Please try again.</p>
      <p><strong>Order ID:</strong> ${orderData._id}</p>
      <p><strong>Amount:</strong> £${orderData.amount}</p>
      <p><strong>Delivery Address:</strong> 
  ${orderData.address?.street || ''}, 
  ${orderData.address?.city || ''}, 
  ${orderData.address?.postcode || ''}
</p>

    `
      : `
      <h2>Payment Failure Notification</h2>
      <p><strong>Customer:</strong> ${orderData.address.firstName} ${orderData.address.lastName}</p>
      <p><strong>Order ID:</strong> ${orderData._id}</p>
      <p><strong>Amount:</strong> £${orderData.amount}</p>
      <p>Head to your dashboard to manage the failed payment.</p>
    `;
  } else if (emailType === 'refundProcessed') {
    // Refund processed email content
    htmlContent = isCustomer
      ? `
      <h2>Refund Processed</h2>
      <p>Your refund for order <strong>${
        orderData._id
      }</strong> has been processed successfully.</p>
      <p><strong>Amount Refunded:</strong> £${orderData.amount}</p>
      <p><strong>Delivery Address:</strong> 
  ${orderData.address?.street || ''}, 
  ${orderData.address?.city || ''}, 
  ${orderData.address?.postcode || ''}
</p>

    `
      : `
      <h2>Refund Processed Notification</h2>
      <p><strong>Customer:</strong> ${orderData.address.firstName} ${orderData.address.lastName}</p>
      <p>Refund for order ID <strong>${orderData._id}</strong> has been processed.</p>
      <p><strong>Amount Refunded:</strong> £${orderData.amount}</p>
      <p>Head to your dashboard to process the refund.</p>
    `;
  }

  try {
    const info = await transporter.sendMail({
      from: 'Order Notifications <no-reply@dammyskitchen.co.uk>',
      to,
      subject,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
};

export default sendNotification;
