import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: ''
    },
    subject: {
      type: String
    },
    message: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    replied: {
      type: Boolean,
      default: false
    },
    replyMessage: {
      type: String
    },
    repliedAt: {
      type: Date
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;

