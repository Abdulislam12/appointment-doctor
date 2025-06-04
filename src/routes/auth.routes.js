const express = require("express");
const router = express.Router();
const adminAccess = require("../middlewares/adminAccess");
const verifyAccessToken = require("../middlewares/verifyAccessToken");
const {
  register,
  login,
  logout,
  getProfile,
  refreshAccessTokenController,
  changePasswordController,
  updateProfile,
} = require("../controllers/auth.controller");

router.post("/register", register);

router.post("/login", login);

router.post("/logout", verifyAccessToken, logout);

router.patch("/change-password", verifyAccessToken, changePasswordController);

router.get("/profile", verifyAccessToken, getProfile);

router.patch("/update-profile", verifyAccessToken, updateProfile);

router.post("/refresh-token", refreshAccessTokenController);

module.exports = router;
