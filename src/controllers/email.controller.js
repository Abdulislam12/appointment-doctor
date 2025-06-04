const verifyOtp = require("../services/otpVerify.service");
const ApiResponse = require("../utils/ApiResponse");

// Verifiy Email through OTP

const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const response = await verifyOtp(code);

    return res
      .status(200)
      .json(new ApiResponse(200, "Email verified successfully", response));
  } catch (err) {
    next(err);
  }
};

module.exports = verifyEmail;
