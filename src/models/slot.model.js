const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
    },
    booked: {
      type: Boolean,
      default: false,
    },
    AppointmentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "cancelled", "visited"],
    },
    patientDetails: {
      name: { type: String, trim: true },
      phone: { type: String },
      address: { type: String, trim: true },
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userBookAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    holdUntil: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);
