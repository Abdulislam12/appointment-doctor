const moment = require("moment");
const Slot = require("../models/appointment.model");
const Payment = require("../models/payment.model");
const createSlotsService = async (date, startTime, endTime, duration, doctorId) => {
    const datetimeFormat = "MM-DD-YYYY hh:mm A";

    const start = moment(`${date} ${startTime}`, datetimeFormat);
    const end = moment(`${date} ${endTime}`, datetimeFormat);
    const now = moment();

    if (!start.isValid() || !end.isValid()) {
        throw new Error("Invalid date or time format.");
    }

    if (end.isSameOrBefore(start)) {
        throw new Error("End time must be after start time.");
    }

    if (start.isBefore(now)) {
        throw new Error("Cannot create slots for past times.");
    }

    if (duration < 10 || duration > 60) {
        throw new Error("Duration must be between 10 and 60 minutes.");
    }

    const totalMinutes = end.diff(start, "minutes");
    const numberOfSlots = Math.floor(totalMinutes / duration);

    if (numberOfSlots === 0) {
        throw new Error("No slots could be generated with the given duration.");
    }

    // ❌ Check for duplicate slots
    const existingSlots = await Slot.find({
        userBookAppointment: doctorId,
        date,
        time: {
            $in: Array.from({ length: numberOfSlots }).map((_, i) => {
                const slotStart = start.clone().add(i * duration, "minutes");
                const slotEnd = slotStart.clone().add(duration, "minutes");
                return `${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`;
            }),
        },
    });

    if (existingSlots.length > 0) {
        throw new Error("Some or all of the slots already exist for the given time range.");
    }

    const slotDocuments = [];

    for (let i = 0; i < numberOfSlots; i++) {
        const slotStart = start.clone().add(i * duration, "minutes");
        const slotEnd = slotStart.clone().add(duration, "minutes");

        const slotData = {
            date,
            time: `${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`,
            booked: false,
            AppointmentStatus: "pending",
            paymentStatus: "paid"
            // userBookAppointment: doctorId,
        };

        const savedSlot = await Slot.create(slotData);
        slotDocuments.push(savedSlot);
    }

    return slotDocuments;
};


const getDoctorAvailablePaidAppointmentsService = async (doctorId) => {
    // 1. Find all PAID payment records
    const paidPayments = await Payment.find({ paymentStatus: "paid" });

    // 2. Extract the slotIds from those payments
    const paidSlotIds = paidPayments.map(p => p.slotId);

    // 3. Query the Slot model with the given criteria
    const slots = await Slot.find({
        _id: { $in: paidSlotIds },
        userBookAppointment: doctorId,
        // booked: false,
        // AppointmentStatus: "pending"
    }).sort({ date: 1, time: 1 }).populate("userBookAppointment", "firstName lastName email");

    return slots;
};

// services/doctor.service.js

const updateAppointmentStatusService = async (slotId, status) => {
    const slot = await Slot.findById(slotId);

    if (!slot) {
        throw new Error("Slot not found");
    }

    if (slot.AppointmentStatus !== "pending") {
        throw new Error("Only pending appointments can be updated");
    }

    slot.AppointmentStatus = status;
    slot.booked = status === "approved";

    await slot.save();

    return slot;
};


const getDoctorAppointmentsFilterService = async (doctorId, date, AppointmentStatus) => {
    const filter = {
        userBookAppointment: doctorId,
    };

    // If the date is 'today', match today's date
    if (date === "today") {
        filter.date = moment().format("MM-DD-YYYY");
    } else if (date) {
        filter.date = date; // Assume date is passed as "MM-DD-YYYY"
    }

    // Filter by AppointmentStatus if valid
    if (AppointmentStatus && ["pending", "approved"].includes(AppointmentStatus)) {
        filter.AppointmentStatus = AppointmentStatus;
    }

    const appointments = await Slot.find(filter).populate("userBookAppointment", "name");

    return appointments;
};



module.exports = {
    createSlotsService,
    getDoctorAvailablePaidAppointmentsService,
    updateAppointmentStatusService,
    getDoctorAppointmentsFilterService
};
