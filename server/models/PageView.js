import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  entityType: {
    type: String,
    enum: ['case', 'memory', null],
    default: null
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient analytics queries
pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ entityId: 1, entityType: 1 });

const PageView = mongoose.model('PageView', pageViewSchema);

export default PageView;
