const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const verifyAccessToken = (req, res, next) => {
  // ✅ Check if user is authenticated via session (OAuth)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next(); // OAuth session is valid
  }

  // ✅ Check for JWT token
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) return next(new ApiError(401, "Please Login!"));

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
};

module.exports = verifyAccessToken;
