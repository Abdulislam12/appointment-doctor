const moment = require("moment");
const Slot = require("../models/slot.model");
const User = require("../models/user.model");
const Payment = require("../models/payment.model");
const ApiError = require("../utils/ApiError");

const createDoctorAppointmentSlots = async (
  date,
  startTime,
  endTime,
  duration,
  doctorId
) => {
  const datetimeFormat = "MM-DD-YYYY hh:mm A";

  let start = moment(`${date} ${startTime}`, datetimeFormat);
  let end = moment(`${date} ${endTime}`, datetimeFormat);
  const now = moment();

  if (!start.isValid() || !end.isValid()) {
    throw new ApiError(400, "Invalid date or time format.");
  }

  // If end time is before or equal to start time, assume end time is next day
  if (end.isSameOrBefore(start)) {
    end = end.add(1, "day");
  }

  if (start.isBefore(now)) {
    throw new ApiError(400, "Cannot create slots for past times.");
  }

  if (duration < 10 || duration > 60) {
    throw new ApiError(400, "Duration must be between 10 and 60 minutes.");
  }

  const totalMinutes = end.diff(start, "minutes");
  const numberOfSlots = Math.floor(totalMinutes / duration);

  if (numberOfSlots === 0) {
    throw new ApiError(
      400,
      "No slots could be generated with the given duration."
    );
  }

  // Check for overlapping slots for this doctor (any slot overlapping the time range)
  const overlappingSlots = await Slot.find({
    doctor: doctorId,
    startTime: { $lt: end.toDate() },
    endTime: { $gt: start.toDate() },
  });

  if (overlappingSlots.length > 0) {
    throw new ApiError(
      409,
      "You have existing slots that overlap with the provided time range."
    );
  }

  const slotDocuments = [];

  for (let i = 0; i < numberOfSlots; i++) {
    const slotStart = moment(start).add(i * duration, "minutes");
    const slotEnd = moment(slotStart).add(duration, "minutes");

    const slotData = {
      date, // this is the date of the start time, e.g. "06-02-2025"
      startTime: slotStart.toDate(),
      endTime: slotEnd.toDate(),
      time: `${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`,
      booked: false,
      AppointmentStatus: "pending",
      paymentStatus: "unpaid",
      doctor: doctorId,
      userBookAppointment: null,
      holdUntil: null,
    };

    const savedSlot = await Slot.create(slotData);
    slotDocuments.push(savedSlot);
  }

  return slotDocuments;
};

const fetchDoctorPaidAppointments = async (doctorId) => {
  // 1. Find all PAID payment records
  const paidPayments = await Payment.find({ paymentStatus: "paid" });

  if (paidPayments.length === 0) {
    throw new ApiError(404, "No paid payments found.");
  }

  // 2. Extract the slotIds from those payments
  const paidSlotIds = paidPayments.map((p) => p.slotId);

  // 3. Query the Slot model with the given criteria
  const slots = await Slot.find({
    _id: { $in: paidSlotIds },
    // userBookAppointment: doctorId,
    // booked: false,
    // AppointmentStatus: "pending"
  })
    .sort({ date: 1, time: 1 })
    .populate("userBookAppointment", "firstName lastName email");

  if (slots.length === 0) {
    throw new ApiError(
      404,
      "No available paid appointments found for the specified doctor."
    );
  }

  return slots;
};

const filterDoctorAppointments = async (date, AppointmentStatus) => {
  const filter = {};

  // Filter by date
  // check appointment for current date
  if (date === "today") {
    filter.date = moment().format("MM-DD-YYYY");

    // now check date for if its not today
  } else if (date) {
    if (!moment(date, "MM-DD-YYYY", true).isValid()) {
      throw new ApiError(400, "Invalid date format. Use MM-DD-YYYY.");
    }
    filter.date = date;
  }

  // Filter by appointment status
  if (
    AppointmentStatus &&
    ["pending", "approved"].includes(AppointmentStatus)
  ) {
    filter.AppointmentStatus = AppointmentStatus;
  } else if (AppointmentStatus) {
    throw new ApiError(
      400,
      "Invalid appointment status. Use 'pending' or 'approved'."
    );
  }

  const appointments = await Slot.find(filter)
    .sort({ date: 1, time: 1 })
    .populate("userBookAppointment", "name");

  if (appointments.length === 0) {
    throw new ApiError(
      404,
      "No appointments found for the specified criteria."
    );
  }

  return appointments;
};

const updateDoctorAppointmentStatus = async (slotId, status) => {
  const slot = await Slot.findById(slotId);

  if (!slot) {
    throw new ApiError(404, "Slot not found");
  }

  if (slot.AppointmentStatus !== "pending") {
    throw new ApiError(400, "Only pending appointments can be updated");
  }

  slot.AppointmentStatus = status;
  slot.booked = status === "approved";

  await slot.save();

  return slot;
};

const getAllPatients = async () => {
  return await User.find({ role: "patient" }).select(
    "-password -isEmailVerified -role -verficationCode -verficationTokenExpiresAt"
  );
};

const getAllPayments = async (status) => {
  const filter = {};

  // Allow only specific statuses
  const allowedStatuses = ["succeeded", "refunded", "partial_refund"];
  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  return await Payment.find(filter)
    .populate("slotId", "date time booked")
    .populate("userId", "username email firstName lastName")
    .select("-stripeSessionId -paymentIntentId");
};

module.exports = {
  createDoctorAppointmentSlots,
  fetchDoctorPaidAppointments,
  updateDoctorAppointmentStatus,
  filterDoctorAppointments,
  getAllPatients,
  getAllPayments,
};
