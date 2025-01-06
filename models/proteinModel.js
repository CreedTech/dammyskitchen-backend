import mongoose from 'mongoose';

const proteinSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Price for the protein
});

const proteinModel =
  mongoose.models.Protein || mongoose.model('Protein', proteinSchema);

export default proteinModel;
