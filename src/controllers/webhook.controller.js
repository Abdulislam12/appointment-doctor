const webhookService = require("../services/webhook.service");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// WebHook Controller

const handleStripeWebhook = async (req, res) => {
  // extract the stripe header
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // verifiy it
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // send to the webhook service
    await webhookService.processStripeEvent(event);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Processing Error:", err.message);
    res.status(500).send(`Internal Error: ${err.message}`);
  }
};

module.exports = {
  handleStripeWebhook,
};
