import express from 'express';
import Suggestion from '../models/Suggestion.js';
import { protect, moderatorOnly } from '../middleware/auth.js';

const router = express.Router();

// Get all suggestions (Moderator only)
router.get('/', protect, moderatorOnly, async (req, res) => {
  try {
    const suggestions = await Suggestion.find()
      .populate('caseId', 'title caseNumber')
      .sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create suggestion (Public)
router.post('/', async (req, res) => {
  try {
    const suggestion = await Suggestion.create(req.body);
    res.status(201).json(suggestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update suggestion status (Moderator only)
router.put('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const suggestion = await Suggestion.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }
    res.json(suggestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete suggestion (Moderator only)
router.delete('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const suggestion = await Suggestion.findByIdAndDelete(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }
    res.json({ message: 'Suggestion deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

