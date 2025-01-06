import mongoose from 'mongoose';

const containerSchema = new mongoose.Schema({
  size: { type: String, required: true }, // e.g., "750 ml", "2 liters"
  price: { type: Number, required: true }, // Base price for this container size
  includesProtein: { type: Boolean, default: false }, // Whether proteins are included
});

const containerModel =
  mongoose.models.Container || mongoose.model('Container', containerSchema);

export default containerModel;
