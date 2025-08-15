import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import getRawBody from "raw-body";
import { randomUUID } from "crypto";

import db, {
  insertVehicle,
  findActiveByVehicleNo,
  updateCheckout,
  listVehicles,
  deleteVehicleById,
  upsertPayment,
  findPaymentByOrderId
} from "./db.js";

import { notifyCheckin, notifyPaymentSuccess } from "./sms.js";
import { razorpay, verifyWebhookSignature } from "./payments.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || true,
  credentials: false
}));

// JSON for normal APIs
app.use(bodyParser.json());

// Static files (frontend)
app.use(express.static("public"));

/* ===== Utilities ===== */
const diffPretty = (ms) => {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h === 0 ? `${m} min` : `${h} hr ${rem} min`;
};

/* ===== API: Check-In ===== */
app.post("/api/checkin", async (req, res) => {
  try {
    const { vehicleNo, owner, phone = "", type = "", notes = "", checkInISO } = req.body || {};
    if (!vehicleNo || !owner) return res.status(400).json({ error: "vehicleNo and owner are required" });
    const id = randomUUID();
    const ticket = `T-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`.toUpperCase();
    const checkin_iso = checkInISO ? new Date(checkInISO).toISOString() : new Date().toISOString();

    insertVehicle.run({
      id,
      ticket,
      vehicle_no: String(vehicleNo).trim().toUpperCase(),
      owner: String(owner).trim(),
      phone: String(phone).trim(),
      type: String(type).trim(),
      notes: String(notes).trim(),
      checkin_iso
    });

    // SMS to admin number
    notifyCheckin({ ticket, vehicle_no: vehicleNo, owner, checkin_iso }).catch(()=>{});

    return res.json({
      ok: true,
      record: { id, ticket, vehicleNo, owner, phone, type, notes, checkin_iso, status: "parked" }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to check-in" });
  }
});

/* ===== API: Check-Out ===== */
app.post("/api/checkout", (req, res) => {
  try {
    const { vehicleNo, checkOutISO, notes = "" } = req.body || {};
    if (!vehicleNo) return res.status(400).json({ error: "vehicleNo is required" });
    const rec = findActiveByVehicleNo.get(String(vehicleNo).trim().toUpperCase());
    if (!rec) return res.status(404).json({ error: "No parked vehicle with that number" });

    const checkout_iso = checkOutISO ? new Date(checkOutISO).toISOString() : new Date().toISOString();
    const duration_ms = new Date(checkout_iso) - new Date(rec.checkin_iso);

    updateCheckout.run({
      id: rec.id,
      checkout_iso,
      duration_ms: Math.max(0, duration_ms),
      notes
    });

    return res.json({
      ok: true,
      receipt: {
        ticket: rec.ticket,
        vehicleNo: rec.vehicle_no,
        owner: rec.owner,
        checkIn: rec.checkin_iso,
        checkOut: checkout_iso,
        duration: diffPretty(Math.max(0, duration_ms))
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to check-out" });
  }
});

/* ===== API: Records ===== */
app.get("/api/records", (req, res) => {
  const rows = listVehicles.all();
  res.json({ ok: true, rows });
});

app.delete("/api/records/:id", (req, res) => {
  deleteVehicleById.run(req.params.id);
  res.json({ ok: true });
});

/* ===== API: Razorpay - Create Order ===== */
app.post("/api/create-order", async (req, res) => {
  try {
    const { ticket, amount } = req.body || {};
    if (!ticket || !amount) return res.status(400).json({ error: "ticket and amount are required" });
    const paise = Math.round(Number(amount) * 100);

    const order = await razorpay.orders.create({
      amount: paise,
      currency: "INR",
      receipt: ticket,
      notes: { ticket }
    });

    // store payment record
    upsertPayment.run({
      id: randomUUID(),
      ticket,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      method: null
    });

    res.json({
      ok: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/* ===== Webhook: Razorpay ===== */
app.post("/webhooks/razorpay", async (req, res) => {
  try {
    const raw = await getRawBody(req);
    const signature = req.get("x-razorpay-signature");
    if (!signature) return res.status(400).send("Missing signature");
    const valid = verifyWebhookSignature(raw, signature);
    if (!valid) return res.status(400).send("Invalid signature");

    const event = JSON.parse(raw.toString("utf8"));

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const { order_id, method, amount } = payment;

      const existing = findPaymentByOrderId.get(order_id);
      if (existing) {
        upsertPayment.run({
          id: existing.id,
          ticket: existing.ticket,
          order_id,
          amount,
          currency: "INR",
          status: "captured",
          method
        });

        // optional SMS
        notifyPaymentSuccess({ ticket: existing.ticket, amount }).catch(()=>{});
      }
    }

    return res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).send("Webhook error");
  }
});

/* ===== Start ===== */
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Open http://localhost:%s/ to use the admin UI", PORT);
});
