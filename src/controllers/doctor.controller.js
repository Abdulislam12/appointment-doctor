const {
  createDoctorAppointmentSlots,
  fetchDoctorPaidAppointments,
  updateDoctorAppointmentStatus,
  filterDoctorAppointments,
  getAllPatients,
  getAllPayments,
} = require("../services/doctor.service");
const ApiResponse = require("../utils/ApiResponse");

const createDoctorSlotController = async (req, res, next) => {
  // const allowedFields = ["date", "startTime", "endTime", "duration"];

  try {
    // const receivedFields = Object.keys(req.body);
    // const extraFields = receivedFields.filter(
    //   (field) => !allowedFields.includes(field)
    // );

    // if (extraFields.length > 0) {
    //   return res
    //     .status(400)
    //     .json(new ApiResponse(400, `Extra fields not allowed: ${extraFields}`));
    // }

    const { date, startTime, endTime, duration } = req.body;

    const result = await createDoctorAppointmentSlots(
      date,
      startTime,
      endTime,
      duration,
      req.user._id
    );

    return res
      .status(201)
      .json(new ApiResponse(201, "Appointment Set Successfully", result));
  } catch (err) {
    next(err);
  }
};

const getPaidPendingAppointmentsController = async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json(
          new ApiResponse(403, "Access denied. Only doctors can access this.")
        );
    }

    const doctorId = req.user._id;
    if (!doctorId) {
      throw new ApiError(400, "Doctor ID is required.");
    }

    const appointments = await fetchDoctorPaidAppointments(doctorId);

    return res.status(200).json(
      new ApiResponse(200, "Paid pending appointments fetched", {
        appointments,
        count: appointments.length,
      })
    );
  } catch (err) {
    next(err);
  }
};

const filterDoctorAppointmentsController = async (req, res, next) => {
  try {
    const { date, AppointmentStatus } = req.query;

    const appointments = await filterDoctorAppointments(
      date,
      AppointmentStatus
    );

    return res.status(200).json(
      new ApiResponse(200, "Filtered appointments fetched successfully", {
        appointments,
        count: appointments.length,
      })
    );
  } catch (err) {
    next(err);
  }
};

const updateDoctorAppointmentStatusController = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    if (!["approved", "cancelled"].includes(status)) {
      return res.status(400).json(new ApiResponse(400, "Invalid status value"));
    }
    const updatedSlot = await updateDoctorAppointmentStatus(slotId, status);

    return res
      .status(200)
      .json(
        new ApiResponse(200, `Appointment ${status} successfully`, updatedSlot)
      );
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const patients = await getAllPatients();
    res.status(200).json(
      new ApiResponse(
        200,
        {
          count: patients.length,
          patients,
        },
        "Patients fetched"
      )
    );
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const payments = await getAllPayments(status);
    res.status(200).json(
      new ApiResponse(
        200,
        {
          count: payments.length,
          payments,
        },
        "Payments fetched"
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDoctorSlotController,
  getPaidPendingAppointmentsController,
  updateDoctorAppointmentStatusController,
  filterDoctorAppointmentsController,
  getPatients,
  getPayments,
};
