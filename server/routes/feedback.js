import express from 'express';
import Feedback from '../models/Feedback.js';
import { protect, moderatorOnly } from '../middleware/auth.js';

const router = express.Router();

// Get all feedback (Moderator only)
router.get('/', protect, moderatorOnly, async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create feedback (Public)
router.post('/', async (req, res) => {
  try {
    const feedback = await Feedback.create(req.body);
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as read (Moderator only)
router.put('/:id/read', protect, moderatorOnly, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete feedback (Moderator only)
router.delete('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

