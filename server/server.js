import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import suggestionsRoutes from './routes/suggestions.js';
import feedbackRoutes from './routes/feedback.js';
import usersRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';

// Загружаем переменные окружения из .env файла
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const PROJECT_MODE = process.env.PROJECT_MODE || 'dev';

// CORS настройки в зависимости от режима
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование режима работы
console.log(`🚀 Starting server in ${PROJECT_MODE.toUpperCase()} mode`);

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/repression-archive',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

