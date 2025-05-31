const { createSlotsService, getDoctorAvailablePaidAppointmentsService, updateAppointmentStatusService, getDoctorAppointmentsFilterService
} = require("../services/doctor.service")
const ApiResponse = require("../utils/ApiResponse")


const createSlots = async (req, res, next) => {
    const allowedFields = ["date", "startTime", "endTime", "duration"];

    try {
        const receivedFields = Object.keys(req.body);

        // Check for extra/unexpected fields
        const extraFields = receivedFields.filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            return res.status(400).json(new ApiResponse(400, `Extra fields not allowed: ${extraFields}`));
        }
        const { date, startTime, endTime, duration } = req.body;
        const result = await createSlotsService(date, startTime, endTime, duration, req.user._id);

        return res.status(201).json(new ApiResponse(201, "Appointment Set Successfully", result));
    } catch (err) {
        next(err)
    }


};

const getDoctorAvailablePaidAppointments = async (req, res, next) => {
    try {
        if (req.user.role !== "doctor") {
            return res.status(403).json(new ApiResponse(403, "Access denied. Only doctors can access this."));
        }

        const doctorId = req.user._id;
        if (!doctorId) {
            throw new ApiError(400, "Doctor ID is required.");
        }

        const appointments = await getDoctorAvailablePaidAppointmentsService(doctorId);

        return res.status(200).json(new ApiResponse(200, "Paid pending appointments fetched", appointments));
    } catch (err) {
        next(err);
    }
};

const getDoctorAppointmentsWithFilter = async (req, res, next) => {
    try {
        const { date, AppointmentStatus } = req.query;

        const appointments = await getDoctorAppointmentsFilterService(date, AppointmentStatus);

        return res.status(200).json(new ApiResponse(200, "Filtered appointments fetched successfully", appointments));
    } catch (err) {
        next(err);
    }
};

const updateAppointmentStatusController = async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { status } = req.body;

        if (!["approved", "cancelled"].includes(status)) {
            return res.status(400).json(new ApiResponse(400, "Invalid status value"));
        }

        const updatedSlot = await updateAppointmentStatusService(slotId, status);

        return res.status(200).json(new ApiResponse(200, `Appointment ${status} successfully`, updatedSlot));
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createSlots,
    getDoctorAvailablePaidAppointments,
    updateAppointmentStatusController,
    getDoctorAppointmentsWithFilter,
}