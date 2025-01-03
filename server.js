import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import bodyParser from 'body-parser'; // Import bodyParser for raw parsing
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import webhookRouter from './routes/webhookRoute.js';

// App Config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();
app.use(
  '/api/v1/stripe',
  bodyParser.raw({ type: 'application/json' }),
  webhookRouter
);
// middlewares
app.use(express.json()); // Parse incoming JSON payloads
app.use(cors()); // Enable cross-origin requests

// Use the raw body parser only for the webhook route to verify Stripe's signature
// app.use('/api/order/webhook', bodyParser.raw({ type: 'application/json' }));

// api endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter); // This can handle other order-related routes

app.get('/', (req, res) => {
  res.send('API Working');
});

app.listen(port, () => console.log(`Server started on PORT: ${port}`));
