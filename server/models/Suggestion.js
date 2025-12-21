import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    submittedBy: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

export default Suggestion;

