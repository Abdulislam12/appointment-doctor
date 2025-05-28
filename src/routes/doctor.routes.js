const express = require("express");
const router = express.Router();
const { createSlots, getDoctorAvailablePaidAppointments, updateAppointmentStatusController,getDoctorAppointmentsWithFilter } = require("../controllers/doctor.controller");
const verifyAccessToken = require("../middlewares/verifyAccessToken");
const adminAccess = require("../middlewares/adminAccess")

router.post("/create-slot", verifyAccessToken, adminAccess, createSlots);
router.get("/doctor/paid-pending-appointments", verifyAccessToken, adminAccess, getDoctorAvailablePaidAppointments);
router.patch("/update-appointment/:slotId", verifyAccessToken, adminAccess, updateAppointmentStatusController);
router.get("/filter-appointments", verifyAccessToken, adminAccess, getDoctorAppointmentsWithFilter);



module.exports = router;