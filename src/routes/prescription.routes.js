const express = require("express");
const router = express.Router();
const {
  createPrescription,
  downloadPrescription,
} = require("../controllers/prescription.controller");

router.post("/create-prescription", createPrescription);

router.get("/download/:filename", downloadPrescription);

module.exports = router;
