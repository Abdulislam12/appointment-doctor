const { createCheckoutSessionService } = require("../services/payment.service");
const ApiResponse = require("../utils/ApiResponse");

// Stripe checkout Controller

const createCheckoutSessionController = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const userId = req.user?._id;

    const sessionData = await createCheckoutSessionService(slotId, userId);

    res
      .status(200)
      .json(new ApiResponse(200, "Stripe session created", sessionData));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCheckoutSessionController,
};
