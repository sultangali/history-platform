import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { role, blocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, blocked },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

