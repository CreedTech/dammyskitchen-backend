import Protein from '../models/proteinModel.js';

// Add a new protein
export const addProtein = async (req, res) => {
  try {
    const { name, price } = req.body;
    const protein = new Protein({
      name,

      price,
    });
    await protein.save();
    res.json({ success: true, message: 'Protein added successfully', protein });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// List all proteins
export const listProteins = async (req, res) => {
  try {
    const proteins = await Protein.find();
    res.json({ success: true, proteins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a protein
export const updateProtein = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    const protein = await Protein.findByIdAndUpdate(
      id,
      { name, price },
      { new: true }
    );

    if (!protein) {
      return res
        .status(404)
        .json({ success: false, message: 'Protein not found' });
    }

    res.json({ success: true, protein });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a protein
export const deleteProtein = async (req, res) => {
  try {
    const { id } = req.params;

    const protein = await Protein.findByIdAndDelete(id);

    if (!protein) {
      return res
        .status(404)
        .json({ success: false, message: 'Protein not found' });
    }

    res.json({ success: true, message: 'Protein deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
