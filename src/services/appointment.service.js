const Slot = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ApiError = require('../utilis/ApiError');
const validator = require('validator');

// Select Slot Service

// const getAvailableSlots = async (date) => {
//   if ([date].some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, "Valid date is required to fetch slots.");
//   }

//   const now = new Date();

//   // Fetching slots where holdUntil is either null or expired, and not booked yet
//   const availableSlots = await Slot.find({
//     date,
//     booked: false,
//     paymentStatus: { $in: ['unpaid', 'refunded', 'partial_refund'] },
//     $or: [
//       { holdUntil: null },         // Not on hold
//       { holdUntil: { $lt: now } }  // Hold expired
//     ]
//   }).select("date time");

//   // Filter out slots where the time has already passed
//   const filteredSlots = availableSlots.filter((slot) => {
//     const slotDateTime = new Date(`${slot.date} ${slot.time}`);
//     return slotDateTime > now; // Only future slots
//   });

//   return filteredSlots;
// };

// 2

// Get Available Slots
const getAvailableSlots = async (date) => {
  if (!date || typeof date !== 'string' || !date.trim()) {
    throw new ApiError(400, "Valid date is required to fetch slots.");
  }

  const now = new Date();
  const availableSlots = await Slot.find({
    date,
    booked: false,
    $or: [{ holdUntil: null }, { holdUntil: { $lt: now } }]
  }).select('date time');

  return availableSlots.filter(slot => new Date(`${slot.date} ${slot.time}`) > now);
};


// Book Slot Services

// const bookSlot = async (date, time, patientDetails, userId) => {
//   // Validate required fields
//   if ([date, time, userId].some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, 'Date, time, and user ID are required to book a slot.');
//   }

//   // Validate patient details
//   const patientFields = [patientDetails?.name, patientDetails?.phone, patientDetails?.address];
//   if (patientFields.some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, 'Complete patient details (name, phone, address) are required.');
//   }

//   const now = new Date();

//   // Find an available and unbooked slot
//   const slot = await Slot.findOne({
//     date,
//     time,
//     booked: false,
//     $or: [
//       { holdUntil: null },
//       { holdUntil: { $lt: now } } // expired hold
//     ]
//   }).select("-patientDetails");

//   if (!slot) {
//     throw new ApiError(400, 'Slot is not available.');
//   }

//   // Set a temporary freeze (2 minutes)
//   const holdUntil = new Date(now.getTime() + 2 * 60 * 1000);

//   // Attempt to update the slot atomically
//   const updatedSlot = await Slot.findOneAndUpdate(
//     { _id: slot._id, booked: false },
//     {
//       $set: {
//         holdUntil,
//         patientDetails,
//         userBookAppointment: userId
//       }
//     },
//     { new: true }
//   ).populate('userBookAppointment', 'firstName lastName email');

//   if (!updatedSlot) {
//     throw new ApiError(409, 'Slot was taken.');
//   }

//   return updatedSlot;
// };

// 2

const bookSlot = async (date, time, patientDetails, userId) => {
  if (![date, time, userId].every(f => typeof f === 'string' && f.trim())) {
    throw new ApiError(400, 'Date, time, and user ID are required to book a slot.');
  }

  const requiredFields = ['name', 'phone', 'address'];
  if (!patientDetails || requiredFields.some(field => !patientDetails[field]?.trim())) {
    throw new ApiError(400, 'Complete patient details (name, phone, address) are required.');
  }

  const now = new Date();
  const slot = await Slot.findOne({
    date,
    time,
    booked: false,
    $or: [{ holdUntil: null }, { holdUntil: { $lt: now } }]
  });

  if (!slot) throw new ApiError(400, 'Slot is not available.');

  const holdUntil = new Date(now.getTime() + 2 * 60 * 1000);
  const updatedSlot = await Slot.findOneAndUpdate(
    { _id: slot._id, booked: false },
    {
      $set: {
        holdUntil,
        patientDetails,
        userBookAppointment: userId
      }
    },
    { new: true }
  ).populate('userBookAppointment', 'firstName lastName email');

  if (!updatedSlot) throw new ApiError(409, 'Slot was taken.');

  return updatedSlot;
};

// Cancel Slot Services

// const cancelSlotBooking = async (slotId, userId) => {
//   // Validate input using .some()
//   const requiredFields = [slotId, userId];
//   if (requiredFields.some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, 'Slot ID and user ID are required to cancel an appointment.');
//   }

//   // Find the booked slot for the user
//   const slot = await Slot.findOne({ _id: slotId, userBookAppointment: userId });
//   if (!slot) {
//     throw new ApiError(404, 'No booked appointment found to cancel.');
//   }

//   // Calculate time difference
//   const appointmentDateTime = new Date(`${slot.date} ${slot.time}`);
//   const now = new Date();
//   const minutesDiff = (appointmentDateTime - now) / (1000 * 60);
//   const isMoreThan6Hours = minutesDiff >= 360;

//   // Update slot status
//   slot.booked = false;
//   slot.userBookAppointment = null;
//   slot.AppointmentStatus = isMoreThan6Hours ? 'pending' : 'cancelled';

//   if (isMoreThan6Hours) {
//     slot.patientDetails = { name: '', phone: '', address: '' };
//   }

//   // Handle refund
//   if (slot.paymentStatus === 'paid' && slot.stripeSessionId) {
//     const session = await stripe.checkout.sessions.retrieve(slot.stripeSessionId);
//     const paymentIntentId = session.payment_intent;
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     const refundAmount = isMoreThan6Hours
//       ? paymentIntent.amount
//       : Math.floor(paymentIntent.amount * 0.9);

//     await stripe.refunds.create({
//       payment_intent: paymentIntentId,
//       amount: refundAmount,
//     });

//     slot.paymentStatus = isMoreThan6Hours ? 'refunded' : 'partial_refund';
//   }

//   await slot.save();

//   return {
//     slot,
//     note: isMoreThan6Hours
//       ? 'Appointment cancelled. Full refund processed.'
//       : 'Appointment cancelled. 10% fee deducted.',
//   };
// };

// 2

const cancelSlotBooking = async (slotId, userId) => {
  if (![slotId, userId].every(f => typeof f === 'string' && f.trim())) {
    throw new ApiError(400, 'Slot ID and user ID are required to cancel an appointment.');
  }

  const slot = await Slot.findOne({ _id: slotId, userBookAppointment: userId });
  if (!slot) throw new ApiError(404, 'No booked appointment found to cancel.');

  const now = new Date();
  const appointmentDateTime = new Date(`${slot.date} ${slot.time}`);
  const isMoreThan6Hours = (appointmentDateTime - now) / (1000 * 60) >= 360;

  slot.booked = false;
  slot.userBookAppointment = null;
  slot.AppointmentStatus = isMoreThan6Hours ? 'pending' : 'cancelled';
  if (isMoreThan6Hours) slot.patientDetails = { name: '', phone: '', address: '' };

  let paymentNote = '';

  const payment = await Payment.findOne({ slotId });
  if (payment?.status === 'succeeded') {
    const session = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

    const refundAmount = isMoreThan6Hours
      ? paymentIntent.amount
      : Math.floor(paymentIntent.amount * 0.9);

    await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: refundAmount
    });

    payment.status = isMoreThan6Hours ? 'refunded' : 'partial_refund';
    await payment.save();

    paymentNote = isMoreThan6Hours
      ? 'Full refund processed.'
      : '10% cancellation fee deducted.';
  }

  await slot.save();

  return {
    slot,
    note: `Appointment cancelled. ${paymentNote}`
  };
};


// Update Slot Services

// const updateSlot = async (id, date, time, patientDetails, userId) => {
//   // Fetch the slot
//   const slot = await Slot.findById(id);
//   if (!slot) {
//     throw new ApiError(404, 'Appointment slot not found');
//   }

//   // Ensure user is authorized
//   if (!slot.userBookAppointment?.equals(userId)) {
//     throw new ApiError(403, 'You can only update your own booked appointments');
//   }

//   // Validate date
//   if (!validator.isISO8601(date)) {
//     throw new ApiError(400, 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
//   }

//   // Validate time
//   const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
//   if (!timeRegex.test(time)) {
//     throw new ApiError(400, 'Invalid time format. Use HH:MM AM/PM');
//   }

//   // Validate patient details using .some()
//   const requiredFields = ['name', 'phone', 'address'];
//   if (
//     !patientDetails ||
//     requiredFields.some(field => !patientDetails[field] || typeof patientDetails[field] !== 'string' || !patientDetails[field].trim())
//   ) {
//     throw new ApiError(400, 'Invalid patient details. Name, phone, and address are required and must be valid');
//   }

//   // Validate phone number
//   if (!validator.isMobilePhone(patientDetails.phone, 'any')) {
//     throw new ApiError(400, 'Invalid phone number format');
//   }

//   // Check if new date/time slot is available
//   const existingSlot = await Slot.findOne({
//     date,
//     time,
//     booked: false,
//     _id: { $ne: id }
//   });

//   if (!existingSlot) {
//     throw new ApiError(400, 'slot is not available');
//   }

//   // Update and save
//   slot.date = date;
//   slot.time = time;
//   slot.patientDetails = patientDetails;

//   await slot.save();

//   const updatedSlot = await Slot.findById(slot._id)
//     .populate('userBookAppointment', 'firstName lastName email');

//   return updatedSlot;
// };

// 2

const updateSlot = async (id, date, time, patientDetails, userId) => {
  const slot = await Slot.findById(id);
  if (!slot) throw new ApiError(404, 'Appointment slot not found');
  if (!slot.userBookAppointment?.equals(userId)) {
    throw new ApiError(403, 'You can only update your own booked appointments');
  }

  if (!validator.isISO8601(date)) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
  if (!timeRegex.test(time)) {
    throw new ApiError(400, 'Invalid time format. Use HH:MM AM/PM');
  }

  const requiredFields = ['name', 'phone', 'address'];
  if (!patientDetails || requiredFields.some(field => !patientDetails[field]?.trim())) {
    throw new ApiError(400, 'Invalid patient details.');
  }

  if (!validator.isMobilePhone(patientDetails.phone, 'any')) {
    throw new ApiError(400, 'Invalid phone number format');
  }

  const existingSlot = await Slot.findOne({
    date,
    time,
    booked: false,
    _id: { $ne: id }
  });

  if (!existingSlot) throw new ApiError(400, 'Slot is not available');

  slot.date = date;
  slot.time = time;
  slot.patientDetails = patientDetails;
  await slot.save();

  return Slot.findById(slot._id).populate('userBookAppointment', 'firstName lastName email');
};


// Get All Appointments Services

// const fetchUserAppointments = async (userId) => {
//   // Validate userId
//   if ([userId].some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, 'Valid user ID is required to fetch appointments.');
//   }

//   const slots = await Slot.find({
//     userBookAppointment: userId,
//     paymentStatus: 'paid' // Only fetch appointments that are paid
//   }).sort({ date: 1, time: 1 });

//   if (!slots.length) {
//     throw new ApiError(404, 'No appointments found.');
//   }

//   return slots;
// };

// 2

const fetchUserAppointments = async (userId) => {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new ApiError(400, 'Valid user ID is required to fetch appointments.');
  }

  const slots = await Slot.find({
    userBookAppointment: userId
  }).sort({ date: 1, time: 1 });

  if (!slots.length) throw new ApiError(404, 'No appointments found.');

  const paidSlotIds = await Payment.find({ userId, status: 'succeeded' }).distinct('slotId');

  return slots.filter(slot => paidSlotIds.some(id => id.equals(slot._id)));
};


// Get Single Appointments Services

// const getAppointmentByIdService = async (id) => {
//   if ([id].some(field => !field || typeof field !== 'string' || !field.trim())) {
//     throw new ApiError(400, 'Valid appointment ID is required.');
//   }

//   const appointment = await Slot.findById(id);

//   if (!appointment) {
//     throw new ApiError(404, 'Appointment not found');
//   }

//   if (appointment.paymentStatus !== 'paid') {
//     throw new ApiError(403, 'You must complete the payment to view this appointment.');
//   }

//   return appointment;
// };

const getAppointmentByIdService = async (id) => {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ApiError(400, 'Valid appointment ID is required.');
  }

  const slot = await Slot.findById(id);
  if (!slot) throw new ApiError(404, 'Appointment not found');

  const payment = await Payment.findOne({ slotId: id });
  if (!payment || payment.status !== 'succeeded') {
    throw new ApiError(403, 'You must complete the payment to view this appointment.');
  }

  return slot;
};


module.exports = { getAvailableSlots, bookSlot, cancelSlotBooking, updateSlot, fetchUserAppointments, getAppointmentByIdService }