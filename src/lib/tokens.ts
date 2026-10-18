import "server-only";
import crypto from "node:crypto";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return s ?? "dev-only-secret-change-me";
};

export const sign = (value: string) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");
export const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Checkout access: the browser that created a booking holds a signed cookie for it */
export const checkoutCookie = (code: string) => `bk_${code}`;
export const checkoutToken = (code: string) => sign(`checkout:${code}`);
