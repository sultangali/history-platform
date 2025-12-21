import express from 'express';
import Case from '../models/Case.js';
import { protect, moderatorOnly } from '../middleware/auth.js';

const router = express.Router();

// Get all cases (with filters and search)
router.get('/', async (req, res) => {
  try {
    const { search, location, yearFrom, yearTo, limit } = req.query;

    let query = {};

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Year range filter
    if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year.$gte = parseInt(yearFrom);
      if (yearTo) query.year.$lte = parseInt(yearTo);
    }

    let casesQuery = Case.find(query).sort({ createdAt: -1 });

    if (limit) {
      casesQuery = casesQuery.limit(parseInt(limit));
    }

    const cases = await casesQuery;

    res.json({ cases, count: cases.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single case
router.get('/:id', async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.json(caseItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create case (Moderator only)
router.post('/', protect, moderatorOnly, async (req, res) => {
  try {
    const caseData = {
      ...req.body,
      createdBy: req.user._id
    };

    const newCase = await Case.create(caseData);
    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update case (Moderator only)
router.put('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    const updatedCase = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    res.json(updatedCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete case (Moderator only)
router.delete('/:id', protect, moderatorOnly, async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ message: 'Case not found' });
    }

    await Case.findByIdAndDelete(req.params.id);
    res.json({ message: 'Case deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

