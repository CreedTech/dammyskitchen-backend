import express from 'express';
import { stripeWebhook } from '../controllers/orderController.js';

const webhookRouter = express.Router();

webhookRouter.post('/webhook',stripeWebhook)

export default webhookRouter;
