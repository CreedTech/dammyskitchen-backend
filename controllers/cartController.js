import userModel from '../models/userModel.js';

// add products to user cart
const addToCart = async (req, res) => {
  try {
    const { userId, itemId, totalPrice, spiceLevel, size, protein } = req.body;

    const userData = await userModel.findById(userId);
    let cartData = userData.cartData || {};

    // Create a string of protein names separated by commas
    const proteinNames = protein.map((p) => p.name).join(', ');

    // Generate a unique key for the combination of size, protein, and spiceLevel
    const selectionKey = `${size.size}-${proteinNames}-${spiceLevel}`;

    // Check if the item already exists in the cart
    if (cartData[itemId]) {
      const existingSelection = cartData[itemId][selectionKey];

      if (existingSelection) {
        // If the same item exists, increase the quantity
        cartData[itemId][selectionKey].quantity += 1;
      } else {
        // If the item with selected options does not exist, add it
        cartData[itemId][selectionKey] = {
          quantity: 1,
          size,
          protein,
          spiceLevel,
          totalPrice,
        };
      }
    } else {
      // If the item does not exist in the cart, add it with the selected options
      cartData[itemId] = {
        [selectionKey]: {
          quantity: 1,
          size,
          protein,
          spiceLevel,
          totalPrice,
        },
      };
    }

    // Update the user's cart data
    await userModel.findByIdAndUpdate(userId, { cartData });

    res.json({ success: true, message: 'Added to Cart' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// update user cart
const updateCart = async (req, res) => {
  try {
    const { userId, itemId, selectionKey, quantity, price } = req.body;

    const userData = await userModel.findById(userId);
    let cartData = userData.cartData;

    if (cartData[itemId] && cartData[itemId][selectionKey]) {
      if (quantity === 0) {
        // Remove the item if quantity is 0
        delete cartData[itemId][selectionKey];

        // If no items are left for this itemId, delete the entire item
        if (Object.keys(cartData[itemId]).length === 0) {
          delete cartData[itemId];
        }
      } else {
        // Update the quantity if the item exists
        cartData[itemId][selectionKey].quantity = quantity;
        cartData[itemId][selectionKey].totalPrice = price * quantity; // Update totalPrice
      }

      // Save the updated cart data to the database
      await userModel.findByIdAndUpdate(userId, { cartData });

      res.json({ success: true, message: 'Cart updated successfully' });
    } else {
      res.json({ success: false, message: 'Item not found in cart' });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// const updateCart = async (req, res) => {
//   try {
//     console.log(req.body);
//     const { userId, itemId, size, protein, spiceLevel, quantity, totalPrice } =
//       req.body;
//     console.log(
//       userId,
//       itemId,
//       size,
//       protein,
//       spiceLevel,
//       quantity,
//       totalPrice
//     );

//     // Validate input
//     if (!userId || !itemId || typeof quantity !== 'number') {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid input. Please provide userId, itemId, and quantity.',
//       });
//     }

//     // Find the user in the database
//     const userData = await userModel.findById(userId);
//     if (!userData) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'User not found.' });
//     }

//     const cartData = userData.cartData || {};

//     // Check if the item exists in the cart
//     if (cartData[itemId]) {
//       // Update the item details
//       if (quantity > 0) {
//         cartData[itemId].quantity = quantity;

//         // Update optional fields if provided
//         if (size) cartData[itemId].size = size;
//         if (protein) cartData[itemId].protein = protein;
//         if (spiceLevel !== undefined) cartData[itemId].spiceLevel = spiceLevel;
//         if (totalPrice !== undefined) cartData[itemId].totalPrice = totalPrice;
//       } else {
//         // If quantity is 0, remove the item from the cart
//         delete cartData[itemId];
//       }
//     } else if (quantity > 0) {
//       // Add a new item to the cart if it doesn't exist
//       cartData[itemId] = {
//         quantity,
//         size: size || [],
//         protein: protein || [],
//         spiceLevel: spiceLevel || null,
//         totalPrice: totalPrice || null,
//       };
//     }

//     // Update the user's cart in the database
//     await userModel.findByIdAndUpdate(userId, { cartData });

//     res.json({ success: true, message: 'Cart updated successfully.' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// get user cart data
const getUserCart = async (req, res) => {
  try {
    const { userId } = req.body;

    const userData = await userModel.findById(userId);
    let cartData = await userData.cartData;

    res.json({ success: true, cartData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { addToCart, updateCart, getUserCart };
