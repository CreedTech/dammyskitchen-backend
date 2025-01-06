import Container from '../models/containerModel.js';

// Create a Container
export const createContainer = async (req, res) => {
  try {
    const { size, price, includesProtein } = req.body;

    const container = new Container({ size, price, includesProtein });
    await container.save();

    res.json({ success: true, container });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Update a Container
export const updateContainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, price, includesProtein } = req.body;

    const container = await Container.findByIdAndUpdate(
      id,
      { size, price, includesProtein },
      { new: true }
    );

    if (!container) {
      return res
        .status(404)
        .json({ success: false, message: 'Container not found' });
    }

    res.json({ success: true, container });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a Container
export const deleteContainer = async (req, res) => {
  try {
    const { id } = req.params;

    const container = await Container.findByIdAndDelete(id);

    if (!container) {
      return res
        .status(404)
        .json({ success: false, message: 'Container not found' });
    }

    res.json({ success: true, message: 'Container deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// List Containers
export const listContainers = async (req, res) => {
  try {
    const containers = await Container.find();
    res.json({ success: true, containers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
