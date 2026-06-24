const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to Database
const connectDB = require('./config/db');
connectDB();

const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log HTTP requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Smart Apartment Management API is running.' });
});

// Routes Registration
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/flats', require('./routes/flatRoutes'));
app.use('/api/visitors', require('./routes/visitorRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/notices', require('./routes/noticeRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));

// 404 Route handler for unrecognized endpoints
app.use('*', (req, res, next) => {
  res.status(404).json({ success: false, message: `Resource not found - Cannot ${req.method} ${req.baseUrl}` });
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
