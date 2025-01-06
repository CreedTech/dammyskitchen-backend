import express from 'express';
import {
  addProtein,
  deleteProtein,
  listProteins,
  updateProtein,
} from '../controllers/proteinController.js';

const proteinRouter = express.Router();

// Add a new protein
proteinRouter.post('/add', addProtein);

// List all proteins
proteinRouter.get('/list', listProteins);

// Update a protein
proteinRouter.put('/update/:id', updateProtein);

// Remove a protein
proteinRouter.delete('/delete/:id', deleteProtein);

export default proteinRouter;
