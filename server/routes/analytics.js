import express from 'express';
import PageView from '../models/PageView.js';
import Case from '../models/Case.js';
import { protect, moderatorOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/overview - visitors for multiple periods
router.get('/overview', protect, moderatorOnly, async (req, res) => {
  try {
    const now = new Date();
    
    // Start of today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of this week (Monday)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    
    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Start of this quarter
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
    
    // Start of this half-year (Jan 1 or Jul 1)
    const halfYearMonth = now.getMonth() < 6 ? 0 : 6;
    const halfYearStart = new Date(now.getFullYear(), halfYearMonth, 1);

    const [today, week, month, quarter, halfYear, allTime] = await Promise.all([
      PageView.countDocuments({ createdAt: { $gte: todayStart } }),
      PageView.countDocuments({ createdAt: { $gte: weekStart } }),
      PageView.countDocuments({ createdAt: { $gte: monthStart } }),
      PageView.countDocuments({ createdAt: { $gte: quarterStart } }),
      PageView.countDocuments({ createdAt: { $gte: halfYearStart } }),
      PageView.countDocuments()
    ]);

    res.json({ today, week, month, quarter, halfYear, allTime });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/analytics/popular - top 10 most viewed cases/memories
router.get('/popular', protect, moderatorOnly, async (req, res) => {
  try {
    const popular = await PageView.aggregate([
      { $match: { entityId: { $ne: null } } },
      { $group: { _id: '$entityId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    // Populate case/memory info
    const entityIds = popular.map(p => p._id);
    const entities = await Case.find({ _id: { $in: entityIds } })
      .select('title personName type status year createdBy')
      .populate('createdBy', 'fullName');

    const result = popular.map(p => {
      const entity = entities.find(e => e._id.toString() === p._id.toString());
      return {
        _id: p._id,
        views: p.views,
        title: entity ? (entity.type === 'memory' ? (entity.personName || entity.title) : entity.title) : 'Unknown',
        type: entity?.type || 'case',
        status: entity?.status || 'unknown',
        year: entity?.year || null,
        createdBy: entity?.createdBy?.fullName || null
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/analytics/by-date - visitor counts per day for charts
router.get('/by-date', protect, moderatorOnly, async (req, res) => {
  try {
    const { from, to, period = '30days' } = req.query;
    
    // Calculate date range based on period
    const endDate = to ? new Date(to) : new Date();
    let startDate;
    
    if (from) {
      startDate = new Date(from);
    } else {
      const daysMap = {
        '7days': 7,
        '30days': 30,
        '90days': 90,
        '180days': 180,
        '365days': 365
      };
      const days = daysMap[period] || 30;
      startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const data = await PageView.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Format for frontend
    const result = data.map(d => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      count: d.count
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
