import Database from "better-sqlite3";
import { resolve } from "path";

const dbPath = process.env.DB_PATH || "./parking.db";
const db = new Database(resolve(dbPath));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  ticket TEXT UNIQUE NOT NULL,
  vehicle_no TEXT NOT NULL,
  owner TEXT NOT NULL,
  phone TEXT,
  type TEXT,
  notes TEXT,
  checkin_iso TEXT NOT NULL,
  checkout_iso TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'parked',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicle_no ON vehicles(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_status ON vehicles(status);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  ticket TEXT NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(ticket) REFERENCES vehicles(ticket)
);
`);

export const insertVehicle = db.prepare(`
  INSERT INTO vehicles
  (id, ticket, vehicle_no, owner, phone, type, notes, checkin_iso, status)
  VALUES (@id, @ticket, @vehicle_no, @owner, @phone, @type, @notes, @checkin_iso, 'parked')
`);

export const findActiveByVehicleNo = db.prepare(`
  SELECT * FROM vehicles WHERE vehicle_no = ? AND status = 'parked' LIMIT 1
`);

export const updateCheckout = db.prepare(`
  UPDATE vehicles
  SET checkout_iso=@checkout_iso, duration_ms=@duration_ms, status='checkedout', notes=COALESCE(NULLIF(@notes,''), notes), updated_at=datetime('now')
  WHERE id=@id
`);

export const listVehicles = db.prepare(`SELECT * FROM vehicles ORDER BY created_at DESC`);

export const deleteVehicleById = db.prepare(`DELETE FROM vehicles WHERE id = ?`);

export const upsertPayment = db.prepare(`
  INSERT INTO payments (id, ticket, order_id, amount, currency, status, method)
  VALUES (@id, @ticket, @order_id, @amount, @currency, @status, @method)
  ON CONFLICT(order_id) DO UPDATE SET status=@status, method=@method, updated_at=datetime('now')
`);

export const findPaymentByOrderId = db.prepare(`SELECT * FROM payments WHERE order_id = ?`);

export default db;
