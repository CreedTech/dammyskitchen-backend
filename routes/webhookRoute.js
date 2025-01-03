import express from 'express';
import { stripeWebhook } from '../controllers/orderController';

const webhookRouter = express.Router();

userRouter.post('/webhook',stripeWebhook)

export default webhookRouter;