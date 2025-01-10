import express from 'express';
import { requestQuote } from '../utils/emailQuote.js';

const quoteRouter = express.Router();

quoteRouter.post('/quote', requestQuote);

export default quoteRouter;
