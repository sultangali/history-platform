import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    caseNumber: {
      type: String
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: String
    },
    district: {
      type: String
    },
    region: {
      type: String
    },
    dateFrom: {
      type: Date
    },
    dateTo: {
      type: Date
    },
    year: {
      type: Number
    },
    victims: [
      {
        type: String
      }
    ],
    documents: [
      {
        name: String,
        url: String
      }
    ],
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Index for search
caseSchema.index({ title: 'text', description: 'text', victims: 'text' });

const Case = mongoose.model('Case', caseSchema);

export default Case;

