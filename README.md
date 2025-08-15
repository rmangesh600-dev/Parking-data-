# Parking Backend (Express + SQLite + Razorpay + Twilio)

Created: 2025-08-14 19:23:30

## Quick Start
1. Install Node.js (LTS). Open a terminal and run:
   ```bash
   cd /mnt/data/parking-backend
   npm i
   ```
2. Copy `.env.example` to `.env` and fill your keys (Razorpay test keys + Twilio + your phone).
3. Start the server:
   ```bash
   npm start
   ```
4. Open http://localhost:8080/ — use **Check-In / Check-Out** and view **Records**.
5. Open http://localhost:8080/payment.html for payments.

### SMS to +91 7558459483
The `.env` file already contains `ADMIN_PHONE_IN=+917558459483`. Update if needed.

## API Endpoints
- `POST /api/checkin` → body: `{ vehicleNo, owner, phone?, type?, notes? }`
- `POST /api/checkout` → body: `{ vehicleNo, checkOutISO?, notes? }`
- `GET /api/records` → list all
- `POST /api/create-order` → body: `{ ticket, amount }` (amount in ₹)
- `POST /webhooks/razorpay` → set this in Razorpay dashboard with your webhook secret

## Notes
- This project uses **Razorpay** test mode for India-friendly UPI/GPay/PhonePe flows.
- **Twilio** is used for SMS. If your Twilio number can't send to India, replace `sms.js` with MSG91/TextLocal/Fast2SMS code.
- Database is **SQLite** (`parking.db` in project root).

Happy shipping! 🚀
