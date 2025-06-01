<<<<<<< HEAD
const verifyOtp = require("../services/otpVerify.service");
const ApiResponse = require("../utils/ApiResponse");
const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const response = await verifyOtp(code);
=======
const verifyOtpServices = require('../services/otpVerify.service');
const ApiResponse = require('../utils/ApiResponse');
const verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        const response = await verifyOtpServices(code);
>>>>>>> 506db9f44ae8e936b6f2fddd3b84d4f7817c1d70

    return res
      .status(200)
      .json(new ApiResponse(200, "Email verified successfully", response));
  } catch (err) {
    next(err);
  }
};

module.exports = verifyEmail;
