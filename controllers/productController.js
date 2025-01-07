import { v2 as cloudinary } from 'cloudinary';
import productModel from '../models/productModel.js';

// function for add product
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      bestseller,
      proteins,
      proteinsIncluded,
      containerSizes,
      spiceLevels,
      tags,
    } = req.body;

    // Handle image uploads
    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    const image3 = req.files?.image3?.[0];
    const image4 = req.files?.image4?.[0];

  
    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined
    );

    let imagesUrl = await Promise.all(
      images.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
        });
        return result.secure_url;
      })
    );


    // Prepare product data
    const productData = {
      name,
      description,
    //   category,
      price: Number(price),
    //   subCategory,
      bestseller: bestseller === 'true',
      //   sizes: JSON.parse(sizes),
      image: imagesUrl,
      proteinsIncluded: proteinsIncluded ? JSON.parse(proteinsIncluded) : [],
      proteins: proteins ? JSON.parse(proteins) : [],
      containerSizes: containerSizes ? JSON.parse(containerSizes) : [],
      spiceLevels: spiceLevels ? JSON.parse(spiceLevels) : [0, 1, 2, 3, 4, 5],
      tags: tags ? JSON.parse(tags) : [],
    };

    console.log(productData);

    const product = new productModel(productData);
    await product.save();

    res.json({ success: true, message: 'Product Added' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const listProducts = async (req, res) => {
  try {
    const products = await productModel
      .find({})
      .populate('proteins', 'name price') // Populate proteins with name and price
      .populate('containerSizes', 'size price includesProtein'); // Populate side dishes with name and price

    res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;

    await productModel.findByIdAndDelete(id);
    res.json({ success: true, message: 'Product Removed' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await productModel
      .findById(productId)
      .populate('proteins', 'name price description') // Include detailed protein info
      .populate('containerSizes', 'size price includesProtein'); // Include detailed side dish info

    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export { listProducts, addProduct, removeProduct, singleProduct };
