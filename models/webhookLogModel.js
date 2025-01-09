import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema({
  eventId: { type: String, unique: true, required: true },
  eventType: { type: String, required: true },
  payload: { type: Object, required: true },
  receivedAt: { type: Date, default: Date.now },
});

const webhookLogModel = mongoose.model('WebhookLog', webhookLogSchema);

export default webhookLogModel;