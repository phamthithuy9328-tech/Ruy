// OnePay integration (server-only). Docs: https://mtf.onepay.vn/developer/
// ONEPAY_MODE: "mock" (built-in simulator for demos, never calls OnePay) | "sandbox" (mtf.onepay.vn) | "production".
import "server-only";
import crypto from "node:crypto";

export type Gateway = "domestic" | "intl";

const MODE = (process.env.ONEPAY_MODE ?? "mock") as "mock" | "sandbox" | "production";

const PAYGATE_URL = {
  sandbox: "https://mtf.onepay.vn/paygate/vpcpay.op",
  production: "https://onepay.vn/paygate/vpcpay.op",
};

function creds(gw: Gateway) {
  const p = gw === "domestic" ? "ONEPAY_DOMESTIC" : "ONEPAY_INTL";
  const merchant = process.env[`${p}_MERCHANT_ID`];
  const accessCode = process.env[`${p}_ACCESS_CODE`];
  const hashKey = process.env[`${p}_HASH_KEY`];
  if (MODE !== "mock" && (!merchant || !accessCode || !hashKey)) throw new Error(`Missing ${p}_* environment variables`);
  return { merchant: merchant ?? "MOCK", accessCode: accessCode ?? "MOCK", hashKey: hashKey ?? (process.env.ONEPAY_MOCK_SECRET ?? "A3EFDFABA8653DF2342E8DAC29B51AF0") };
}

export const onepayMode = MODE;

/** String to sign: non-empty vpc_* / user_* params, sorted by name, joined as key=value with & */
function hashData(params: Record<string, string>) {
  return Object.keys(params)
    .filter((k) => (k.startsWith("vpc_") || k.startsWith("user_")) && k !== "vpc_SecureHash" && k !== "vpc_SecureHashType" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export function sign(params: Record<string, string>, hashKey: string) {
  return crypto.createHmac("sha256", Buffer.from(hashKey, "hex")).update(hashData(params), "utf8").digest("hex").toUpperCase();
}

export function verify(params: Record<string, string>, gw: Gateway) {
  const given = params.vpc_SecureHash ?? "";
  const expected = sign(params, creds(gw).hashKey);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function buildPaymentUrl(opts: { gw: Gateway; txnRef: string; amountMinor: number; currency: string; orderInfo: string; ip: string; cardList?: string; baseUrl: string; locale: string }) {
  const c = creds(opts.gw);
  const params: Record<string, string> = {
    vpc_Version: "2",
    vpc_Currency: opts.currency,
    vpc_Command: "pay",
    vpc_AccessCode: c.accessCode,
    vpc_Merchant: c.merchant,
    vpc_Locale: opts.locale === "vi" ? "vn" : "en",
    vpc_ReturnURL: `${opts.baseUrl}/api/onepay/return?gw=${opts.gw}`,
    vpc_CallbackURL: `${opts.baseUrl}/api/onepay/ipn?gw=${opts.gw}`,
    vpc_MerchTxnRef: opts.txnRef,
    vpc_OrderInfo: opts.orderInfo.slice(0, 32),
    vpc_Amount: String(opts.amountMinor), // OnePay expects amount × 100
    vpc_TicketNo: opts.ip,
    AgainLink: `${opts.baseUrl}/manage-booking`,
    Title: "AmGo Travel",
  };
  if (opts.cardList) params.vpc_CardList = opts.cardList; // DOMESTIC | INTERNATIONAL | QR: preselects the method on OnePay's page
  params.vpc_SecureHash = sign(params, c.hashKey);
  const base = MODE === "mock" ? `${opts.baseUrl}/payment/simulator` : PAYGATE_URL[MODE];
  return `${base}?${new URLSearchParams(params).toString()}`;
}

/** Simulator only: sign a result exactly as OnePay would */
export function signResult(gw: Gateway, req: Record<string, string>, success: boolean) {
  const result: Record<string, string> = {
    vpc_Command: "pay",
    vpc_Locale: req.vpc_Locale,
    vpc_Currency: req.vpc_Currency,
    vpc_MerchTxnRef: req.vpc_MerchTxnRef,
    vpc_Merchant: req.vpc_Merchant,
    vpc_OrderInfo: req.vpc_OrderInfo,
    vpc_Amount: req.vpc_Amount,
    vpc_TxnResponseCode: success ? "0" : "99",
    vpc_TransactionNo: String(Date.now()).slice(-8),
    vpc_Message: success ? "Approved" : "User cancel",
  };
  result.vpc_SecureHash = sign(result, creds(gw).hashKey);
  return result;
}

export const responseMessages: Record<string, string> = {
  "0": "Approved",
  "1": "Declined by the issuing bank",
  "3": "Merchant not found",
  "4": "Invalid access code",
  "5": "Invalid amount",
  "7": "Unspecified error",
  "8": "Invalid card number",
  "9": "Invalid cardholder name",
  "10": "Card expired or locked",
  "11": "Card not enabled for online payments",
  "12": "Invalid card dates",
  "13": "Amount exceeds card limit",
  "21": "Insufficient funds",
  "99": "Cancelled by customer",
  B: "3-D Secure authentication error",
  F: "3-D Secure authentication failed",
};
