import twilio from "twilio";

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM,
  ADMIN_PHONE_IN
} = process.env;

let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export async function sendSMS(to, body) {
  if (!client) {
    console.warn("Twilio not configured; SMS skipped:", body);
    return { skipped: true };
  }
  return client.messages.create({ from: TWILIO_FROM, to, body });
}

export async function notifyCheckin({ ticket, vehicle_no, owner, checkin_iso }) {
  const msg =
    `New Check-In\nTicket: ${ticket}\nVehicle: ${vehicle_no}\nOwner: ${owner}\nTime: ${new Date(checkin_iso).toLocaleString()}`;
  const to = ADMIN_PHONE_IN;
  if (!to) return;
  try { await sendSMS(to, msg); } catch (e) { console.error("SMS error:", e.message); }
}

export async function notifyPaymentSuccess({ ticket, amount }) {
  const to = ADMIN_PHONE_IN;
  if (!to) return;
  const rupees = (amount / 100).toFixed(2);
  const msg = `Payment Success\nTicket: ${ticket}\nAmount: ₹${rupees}`;
  try { await sendSMS(to, msg); } catch (e) { console.error("SMS error:", e.message); }
}
