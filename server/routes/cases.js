import express from 'express';
import Case from '../models/Case.js';
import { protect, moderatorOnly } from '../middleware/auth.js';

const router = express.Router();

// Get all cases (with filters and search)
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      location, 
      district,
      yearFrom, 
      yearTo, 
      limit, 
      status,
      createdBy,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20
    } = req.query;

    let query = {};

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // District filter
    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }

    // Year range filter
    if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year.$gte = parseInt(yearFrom);
      if (yearTo) query.year.$lte = parseInt(yearTo);
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      // By default, show only published cases for public access
      // Moderators can explicitly request 'all' or 'draft'
      query.status = 'published';
    }

    // CreatedBy filter
    if (createdBy) {
      query.createdBy = createdBy;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    let casesQuery = Case.find(query)
      .sort(sortObj)
      .populate('createdBy', 'fullName email');

    // Apply pagination if not limited by 'limit' param
    if (limit) {
      casesQuery = casesQuery.limit(parseInt(limit));
    } else {
      casesQuery = casesQuery.skip(skip).limit(parseInt(pageSize));
    }

    const cases = await casesQuery;
    const total = await Case.countDocuments(query);

    res.json({ 
      cases, 
      count: cases.length,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });
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

// Bulk delete cases (Moderator only)
router.delete('/bulk/delete', protect, moderatorOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No case IDs provided' });
    }

    const result = await Case.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Cases deleted', count: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get cases created by current moderator (Moderator only)
router.get('/moderator/my-cases', protect, moderatorOnly, async (req, res) => {
  try {
    const cases = await Case.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'fullName email');
    
    res.json({ cases, count: cases.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get statistics (Moderator only)
router.get('/moderator/statistics', protect, moderatorOnly, async (req, res) => {
  try {
    // Cases by year
    const byYear = await Case.aggregate([
      { $match: { year: { $ne: null } } },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Cases by district
    const byDistrict = await Case.aggregate([
      { $match: { district: { $ne: null, $ne: '' } } },
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Cases by month (created)
    const byMonth = await Case.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Total cases
    const total = await Case.countDocuments();

    // Cases by status
    const byStatus = await Case.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Recent cases (last 5)
    const recentCases = await Case.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'fullName');

    res.json({
      total,
      byYear,
      byDistrict,
      byMonth,
      byStatus,
      recentCases
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

