import mongoose from 'mongoose';
import PageView from '../models/PageView.js';

/**
 * In-memory deduplication cache.
 * Key: "ip:entityId" or "ip:path"
 * Value: timestamp (ms)
 * Entries auto-expire after DEDUP_WINDOW_MS.
 */
const recentViews = new Map();
const DEDUP_WINDOW_MS = 60 * 1000; // 60 seconds

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentViews) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentViews.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Middleware to track page views.
 * - Skips moderators and admins (only count regular visitors)
 * - Deduplicates using in-memory cache (no race conditions)
 * - Runs asynchronously and does not block the response
 */
const trackPageView = (req, res, next) => {
  // Skip tracking for moderators and admins
  if (req.user && (req.user.role === 'moderator' || req.user.role === 'admin')) {
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const cleanIp = typeof ip === 'string' ? ip.split(',')[0].trim() : '';
  const userAgent = req.headers['user-agent'] || '';
  const path = req.originalUrl || req.url;

  // Determine entity info from the route
  let entityId = null;

  if (req.params && req.params.id) {
    try {
      entityId = new mongoose.Types.ObjectId(req.params.id);
    } catch (err) {
      return next();
    }
  }

  // Build dedup key
  const dedupeKey = entityId
    ? `${cleanIp}:${entityId.toString()}`
    : `${cleanIp}:${path}`;

  const now = Date.now();
  const lastSeen = recentViews.get(dedupeKey);

  // If seen within dedup window, skip
  if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return next();
  }

  // Mark as seen IMMEDIATELY (before async DB call) to prevent race conditions
  recentViews.set(dedupeKey, now);

  // Fire and forget -- don't block the response
  PageView.create({
    path,
    entityId,
    entityType: null,
    ip: cleanIp,
    userAgent
  }).catch(err => {
    console.error('PageView tracking error:', err.message);
  });

  next();
};

export default trackPageView;
