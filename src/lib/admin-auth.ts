// Admin auth: scrypt passwords, optional TOTP 2FA (RFC 6238), signed session cookie with idle timeout, roles.
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { safeEqual, sign } from "./tokens";

export type Role = "admin" | "sales" | "editor" | "translator";
export const COOKIE = "amgo_admin";
const IDLE_MS = Number(process.env.ADMIN_SESSION_IDLE_MINUTES ?? 60) * 60_000;

/** What each role may open (admin: everything) */
export const access: Record<string, Role[]> = {
  dashboard: ["admin", "sales", "editor", "translator"],
  bookings: ["admin", "sales"],
  customers: ["admin", "sales"],
  tours: ["admin", "editor", "translator"],
  posts: ["admin", "editor", "translator"],
  reviews: ["admin", "editor"],
  discounts: ["admin", "sales"],
  templates: ["admin", "editor", "translator"],
  webhooks: ["admin"],
  settings: ["admin"],
  users: ["admin"],
  audit: ["admin"],
  account: ["admin", "sales", "editor", "translator"],
};

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  return safeEqual(crypto.scryptSync(pw, salt, 64).toString("hex"), hash);
}

// --- TOTP ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const newTotpSecret = () => Array.from(crypto.randomBytes(20), (b) => B32[b % 32]).join("");
function b32decode(s: string) {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  return Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
}
function totp(secret: string, step: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
export function verifyTotp(secret: string, code: string) {
  const step = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((w) => safeEqual(totp(secret, step + w), code.replace(/\s/g, "")));
}

// --- Session ---
export async function createSession(userId: number) {
  const payload = `${userId}.${Date.now()}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(`admin:${payload}`)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 12 * 3600 });
}

export async function currentAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [uid, ts, sig] = raw.split(".");
  if (!sig || !safeEqual(sig, sign(`admin:${uid}.${ts}`))) return null;
  if (Date.now() - Number(ts) > IDLE_MS) return null;
  const user = await db.adminUser.findUnique({ where: { id: Number(uid) } });
  return user?.active ? user : null;
}

/** Use at the top of every admin page and server action */
export async function requireAdmin(area: keyof typeof access) {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  if (!access[area].includes(user.role as Role)) redirect("/admin?denied=1");
  return user;
}

export async function audit(actor: string, action: string, detail: string) {
  await db.auditLog.create({ data: { actor, action, detail } });
}
