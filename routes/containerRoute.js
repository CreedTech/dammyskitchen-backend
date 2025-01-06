import express from 'express';
import {
  createContainer,
  deleteContainer,
  listContainers,
  updateContainer,
} from '../controllers/containerController.js';

const containerRouter = express.Router();

// Add a new side dish
containerRouter.post('/add', createContainer);

// List all side dishes
containerRouter.get('/list', listContainers);

// Update a side dish
containerRouter.put('/update/:id', updateContainer);

// Remove a side dish
containerRouter.delete('/remove/:id', deleteContainer);

export default containerRouter;
