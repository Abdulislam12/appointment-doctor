const Slot = require("../models/slot.model.js");
const Payment = require("../models/payment.model");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const ApiError = require("../utils/ApiError");
const validator = require("validator");
const moment = require("moment");

// Get Available Slots
const getAvailableSlots = async (date) => {
  if (!date || typeof date !== "string" || !date.trim()) {
    throw new ApiError(400, "Valid date is required to fetch slots.");
  }

  const now = new Date();

  const availableSlots = await Slot.find({
    date,
    booked: false,
    paymentStatus: "unpaid",
    $or: [{ holdUntil: null }, { holdUntil: { $lt: now } }],
  }).select("date time");

  return availableSlots.filter((slot) => {
    const [startTime] = slot.time.split(" - ");
    const slotDateTime = new Date(`${slot.date} ${startTime}`);
    return slotDateTime > now;
  });
};

// Book Slot Services

const bookSlot = async (date, time, patientDetails, userId) => {
  if ([date, time, userId].some((f) => typeof f !== "string" || !f.trim())) {
    throw new ApiError(
      400,
      "Date, time, and user ID are required to book a slot."
    );
  }

  const requiredFields = ["name", "phone", "address"];
  if (
    !patientDetails ||
    requiredFields.some((field) => !patientDetails[field]?.trim())
  ) {
    throw new ApiError(
      400,
      "Complete patient details (name, phone, address) are required."
    );
  }

  const now = new Date();
  const slot = await Slot.findOne({
    date,
    time,
    booked: false,
    $or: [{ holdUntil: null }, { holdUntil: { $lt: now } }],
  });

  if (!slot) throw new ApiError(400, "Slot is not available.");

  const holdUntil = new Date(now.getTime() + 2 * 60 * 1000);
  const updatedSlot = await Slot.findOneAndUpdate(
    { _id: slot._id, booked: false },
    {
      $set: {
        holdUntil,
        patientDetails,
        userBookAppointment: userId,
      },
    },
    { new: true }
  ).populate("userBookAppointment", "firstName lastName email");

  if (!updatedSlot) throw new ApiError(409, "Slot was taken.");

  return updatedSlot;
};

// Cancel Slot Services

const cancelSlotBooking = async (slotId, userId) => {
  if ([slotId, userId].some((f) => typeof f !== "string" || !f.trim())) {
    throw new ApiError(
      400,
      "Slot ID and user ID are required to cancel an appointment."
    );
  }

  const slot = await Slot.findOne({ _id: slotId, userBookAppointment: userId });
  if (!slot) throw new ApiError(404, "No booked appointment found to cancel.");

  // Unbook the slot
  slot.booked = false;
  slot.userBookAppointment = null;
  slot.paymentStatus = "unpaid";
  slot.AppointmentStatus = "cancelled";
  slot.patientDetails = { name: "", phone: "", address: "" };

  let paymentNote = "";

  const payment = await Payment.findOne({ slotId });

  if (payment?.status === "succeeded") {
    if (!payment.stripeSessionId) {
      throw new ApiError(400, "Stripe session ID missing");
    }

    const session = await stripe.checkout.sessions.retrieve(
      payment.stripeSessionId
    );
    const paymentIntentId = session.payment_intent;
    if (!paymentIntentId) {
      throw new ApiError(400, "Stripe payment intent not found");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const charge = paymentIntent.charges?.data?.[0];

    const alreadyRefunded =
      charge?.refunded === true || charge?.amount_refunded > 0;

    if (alreadyRefunded) {
      paymentNote = "Payment was already refunded earlier.";
    } else {
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });

        payment.paymentStatus = "unpaid";
        payment.status = "refunded";
        await payment.save();

        paymentNote = "Full refund processed successfully.";
      } catch (err) {
        if (
          err.code === "charge_already_refunded" ||
          err.raw?.message?.includes("already been refunded")
        ) {
          payment.paymentStatus = "unpaid";
          payment.status = "refunded";
          await payment.save();

          paymentNote = "Payment was already refunded.";
        } else {
          console.error("Stripe refund failed:", err);
          throw new ApiError(500, "Failed to process refund");
        }
      }
    }
  }

  await slot.save();

  return {
    slot,
    note: `Appointment cancelled. ${paymentNote}`,
  };
};

// Update Slot Services

const updateSlot = async (id, date, time, patientDetails, userId) => {
  const slot = await Slot.findById(id);
  if (!slot) throw new ApiError(404, "Appointment slot not found");

  if (!slot.userBookAppointment?.equals(userId)) {
    throw new ApiError(403, "You can only update your own booked appointments");
  }

  // Validate date using moment (accept MM-D-YYYY or MM-DD-YYYY)
  const parsedDate = moment(date, ["MM-D-YYYY", "MM-DD-YYYY"], true);
  if (!parsedDate.isValid()) {
    throw new ApiError(400, "Invalid date format. Use MM-DD-YYYY or MM-D-YYYY");
  }

  // Validate time range (e.g. "01:15 PM - 01:30 PM")
  const timeRangeRegex =
    /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM) - (0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
  if (!timeRangeRegex.test(time)) {
    throw new ApiError(
      400,
      "Invalid time format. Use hh:mm AM/PM - hh:mm AM/PM"
    );
  }

  // Validate patient details
  const requiredFields = ["name", "phone", "address"];
  if (
    !patientDetails ||
    requiredFields.some((field) => !patientDetails[field]?.trim())
  ) {
    throw new ApiError(400, "Invalid patient details.");
  }

  if (!validator.isMobilePhone(patientDetails.phone, "any")) {
    throw new ApiError(400, "Invalid phone number format");
  }

  // Check if the requested slot time is already booked by someone else
  const existingSlot = await Slot.findOne({
    date,
    time,
    booked: true,
    _id: { $ne: id },
  });

  if (existingSlot) {
    throw new ApiError(400, "Slot is not available");
  }

  // Update slot details
  slot.date = date;
  slot.time = time;
  slot.patientDetails = patientDetails;
  slot.AppointmentStatus = "pending"; // Reset status on update
  await slot.save();

  return Slot.findById(slot._id).populate(
    "userBookAppointment",
    "firstName lastName email"
  );
};
// Get All Appointments Services

const fetchUserAppointments = async (userId) => {
  if ([userId].some((f) => !f || typeof f !== "string" || !f.trim())) {
    throw new ApiError(400, "Valid user ID is required to fetch appointments.");
  }
  const slots = await Slot.find({
    userBookAppointment: userId,
  }).sort({ date: 1, time: 1 });

  if (!slots.length) throw new ApiError(404, "No appointments found.");

  const paidSlotIds = await Payment.find({
    userId,
  }).distinct("slotId");

  return slots.filter((slot) => paidSlotIds.some((id) => id.equals(slot._id)));
};

// Get Single Appointments Services

const getAppointmentByIdService = async (id) => {
  const slot = await Slot.findById(id);
  if (!slot) throw new ApiError(404, "Appointment not found");

  return slot;
};

module.exports = {
  getAvailableSlots,
  bookSlot,
  cancelSlotBooking,
  updateSlot,
  fetchUserAppointments,
  getAppointmentByIdService,
};
