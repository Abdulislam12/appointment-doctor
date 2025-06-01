const rateLimit = require("express-rate-limit");
const ApiResponse = require("../utils/ApiResponse");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = new ApiResponse(
      429,
      "Too many auth attempts from this IP, please try again later."
    );
    res.status(429).json(response);
  },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = new ApiResponse(
      429,
      "Too many payment requests, please slow down."
    );
    res.status(429).json(response);
  },
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response = new ApiResponse(
      429,
      "Too many email requests, please wait before retrying."
    );
    res.status(429).json(response);
  },
});

module.exports = {
  authLimiter,
  paymentLimiter,
  emailLimiter,
};
