const express = require('express');
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const morgan = require('morgan');
const { authLimiter, paymentLimiter, emailLimiter } = require("./src/middlewares/rateLimiter")


// Stripe Web Hook

const webhookRoutes = require('./src/routes/webhook.routes');
app.use('/webhook', webhookRoutes);



// Enable CORS with specific origin and credentials support
app.use(cors({
  origin: process.env.CORS_ORIGIN,  // Allow requests only from this origin
  credentials: true                 // Allow cookies and authorization headers
}));


// Set secure HTTP headers to protect the app from common vulnerabilities
app.use(helmet());


// Log HTTP requests in the console (using 'dev' format) for debugging during development
app.use(morgan('dev'));


// Parse URL-encoded data (from HTML forms) with a size limit of 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" }));


// Parse cookies from the HTTP request header
app.use(cookieParser());


// Parse incoming JSON requests with a size limit of 16kb
app.use(express.json({ limit: "16kb" }));


// @Routes
const authRoutes = require("./src/routes/auth.routes");
const emailRoutes = require("./src/routes/email.routes");
const patientRoutes = require("./src/routes/patient.routes");
const paymentRoutes = require('./src/routes/payment.routes');
const doctorRoutes = require('./src/routes/doctor.routes');



// user Routes
app.use('/api/v1/users', authLimiter, authRoutes);

// email Routes
app.use('/api/v1/email', emailLimiter, emailRoutes);

// payment routes
app.use('/api/v1/payment', paymentLimiter, paymentRoutes);

// patient routes
app.use('/api/v1/patient', patientRoutes);

// doctor routes
app.use('/api/v1/doctor', doctorRoutes);



// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
