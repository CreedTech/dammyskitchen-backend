import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: false },
  message: { type: String, required: true },
});

const quoteModel =
  mongoose.models.Quote || mongoose.model('Quote', quoteSchema);

export default quoteModel;
