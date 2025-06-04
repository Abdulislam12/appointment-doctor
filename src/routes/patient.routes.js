const express = require("express");
const router = express.Router();
const verifyAccessToken = require("../middlewares/verifyAccessToken");
const {
  slotController,
  bookAppointment,
  cancelAppointment,
  updateAppointment,
  getUserAppointments,
  getAppointmentById,
} = require("../controllers/slot.controller");

router.get("/get-slots/:date", slotController);

router.post("/book-appointment", verifyAccessToken, bookAppointment);

router.delete("/cancel-appointment/:id", verifyAccessToken, cancelAppointment);

router.put("/update-appointment/:id", verifyAccessToken, updateAppointment);

router.get("/patient-appointments", verifyAccessToken, getUserAppointments);

router.get("/appointment/:id", verifyAccessToken, getAppointmentById);

module.exports = router;
