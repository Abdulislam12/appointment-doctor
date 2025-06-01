const express = require("express");
const router = express.Router();
const { createDoctorSlotController, getPaidPendingAppointmentsController, updateDoctorAppointmentStatusController, filterDoctorAppointmentsController, getPatients, getPayments } = require("../controllers/doctor.controller");
const verifyAccessToken = require("../middlewares/verifyAccessToken");
const adminAccess = require("../middlewares/adminAccess");


router.post("/create-slot", verifyAccessToken, adminAccess, createDoctorSlotController);
router.get("/doctor/paid-pending-appointments", verifyAccessToken, adminAccess, getPaidPendingAppointmentsController);
router.patch("/update-appointment/:slotId", verifyAccessToken, adminAccess, updateDoctorAppointmentStatusController);
router.get("/patients", verifyAccessToken, adminAccess, getPatients);
router.get("/payments", verifyAccessToken, adminAccess, getPayments);
router.get("/filter-appointments", verifyAccessToken, adminAccess, filterDoctorAppointmentsController);


module.exports = router;