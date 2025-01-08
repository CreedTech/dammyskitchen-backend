import mongoose from 'mongoose';

// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   description: { type: String, required: true },
//   price: { type: Number, required: true },
//   image: { type: Array, required: true },
//   category: { type: String, required: true },
//   subCategory: { type: String, required: true },
//   sizes: { type: Array, required: true }, // e.g., ["S", "M", "L"]
//   bestseller: { type: Boolean, default: false },
//   date: { type: Number, required: true },
//   proteins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Protein' }], // Linked proteins
//   sideDishes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SideDish' }], // Linked side dishes
//   litresAvailability: { type: Boolean, default: false },
//   types: { type: Array }, // e.g., ["Hot", "Cold"]
//   spiceLevels: { type: Array, default: [0, 1, 2, 3, 4, 5] }, // Default spice levels
//   tags: { type: [String], default: [] }, // Metadata tags like ["Spicy", "Vegan"]
// });

// const productModel =
//   mongoose.models.Product || mongoose.model('Product', productSchema);

// export default productModel;

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: false },
  bestseller: { type: Boolean, default: false },
  price: { type: Number, default: 15 }, // Base price for daily size (750 ml)
  image: { type: [String], required: true }, // Array of image URLs
  tags: { type: [String], default: [] }, // Metadata tags like ["Spicy", "Vegan"]
  spiceLevels: { type: Array, default: [0, 1, 2, 3, 4, 5] },
//   proteinsIncluded: [String], // Proteins included for daily size
  proteins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Protein' }], // Linked proteins
  containerSizes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Container' }],
  date: { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', productSchema);
export default Product;
