const moment = require("moment");
const Slot = require("../models/appointment.model");
const Payment = require("../models/payment.model");
const ApiError = require("../utils/ApiError")


const createSlotsService = async (date, startTime, endTime, duration, doctorId) => {
    const datetimeFormat = "MM-DD-YYYY hh:mm A";

    const start = moment(`${date} ${startTime}`, datetimeFormat);
    const end = moment(`${date} ${endTime}`, datetimeFormat);
    const now = moment();

    if (!start.isValid() || !end.isValid()) {
        throw new ApiError(400, "Invalid date or time format.");
    }

    // Check if the end time is the same as or before the start time

    if (end.isSameOrBefore(start)) {
        throw new ApiError(400, "End time must be after start time.");
    }

    // Check if doctor try to create slot for past time 

    if (start.isBefore(now)) {
        throw new ApiError(400, "Cannot create slots for past times.");
    }

    // Minimum and Maximum duration  

    if (duration < 10 || duration > 60) {
        throw new ApiError(400, "Duration must be between 10 and 60 minutes.");
    }

    // convert the time in to minutes

    const totalMinutes = end.diff(start, "minutes");

    // get the number of slots
    const numberOfSlots = Math.floor(totalMinutes / duration);

    if (numberOfSlots === 0) {
        throw new ApiError(400, "No slots could be generated with the given duration.");
    }

    const times = [];

    // this one
    for (let i = 0; i < numberOfSlots; i++) {

        const slotStart = moment(`${date} ${startTime}`, "MM-DD-YYYY hh:mm A").add(i * duration, "minutes");
        const slotEnd = moment(slotStart).add(duration, "minutes");
        times.push(`${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`);
    }
    const existingSlots = await Slot.find({
        // userBookAppointment: doctorId,
        date,
        time: { $in: times },
    });

    if (existingSlots.length > 0) {
        throw new ApiError(409, "Some or all of the slots already exist for the given time range.");
    }

    const slotDocuments = [];

    let currentStart = moment(start);

    for (let i = 0; i < numberOfSlots; i++) {
        const slotStart = moment(currentStart).add(i * duration, "minutes");
        const slotEnd = moment(slotStart).add(duration, "minutes");

        const slotData = {
            date,
            time: `${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`,
            booked: false,
            AppointmentStatus: "pending",
            paymentStatus: "paid",
            userBookAppointment: doctorId,
        };

        const savedSlot = await Slot.create(slotData);
        slotDocuments.push(savedSlot);
    }

    return slotDocuments;
};

const getDoctorAvailablePaidAppointmentsService = async (doctorId) => {

    // 1. Find all PAID payment records
    const paidPayments = await Payment.find({ paymentStatus: "paid" });

    if (paidPayments.length === 0) {
        throw new ApiError(404, "No paid payments found.");
    }

    // 2. Extract the slotIds from those payments
    const paidSlotIds = paidPayments.map(p => p.slotId);

    // 3. Query the Slot model with the given criteria
    const slots = await Slot.find({
        _id: { $in: paidSlotIds },
        userBookAppointment: doctorId,
        // booked: false,
        // AppointmentStatus: "pending"
    }).sort({ date: 1, time: 1 }).populate("userBookAppointment", "firstName lastName email");

    if (slots.length === 0) {
        throw new ApiError(404, "No available paid appointments found for the specified doctor.");
    }

    return slots;
};

const updateAppointmentStatusService = async (slotId, status) => {
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

const getDoctorAppointmentsFilterService = async (date, AppointmentStatus) => {
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
    if (AppointmentStatus && ["pending", "approved"].includes(AppointmentStatus)) {
        filter.AppointmentStatus = AppointmentStatus;
    } else if (AppointmentStatus) {
        throw new ApiError(400, "Invalid appointment status. Use 'pending' or 'approved'.");
    }

    const appointments = await Slot.find(filter).sort({ date: 1, time: 1 }).populate("userBookAppointment", "name");

    if (appointments.length === 0) {
        throw new ApiError(404, "No appointments found for the specified criteria.");
    }

    return appointments;
};


module.exports = {
    createSlotsService,
    getDoctorAvailablePaidAppointmentsService,
    updateAppointmentStatusService,
    getDoctorAppointmentsFilterService,
};
