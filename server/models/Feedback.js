import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;

