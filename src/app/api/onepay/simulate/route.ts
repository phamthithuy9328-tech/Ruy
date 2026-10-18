// Mock mode only: plays OnePay's part. Sends a signed IPN (server-to-server), then redirects the browser to the return URL.
import { NextResponse } from "next/server";
import { handleIpn } from "@/lib/booking";
import { onepayMode, signResult, verify, type Gateway } from "@/lib/onepay";

export async function POST(req: Request) {
  if (onepayMode !== "mock") return new Response("Not found", { status: 404 });
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  const { result, ...p } = form;
  const gw: Gateway = p.vpc_ReturnURL?.includes("gw=intl") ? "intl" : "domestic";
  if (!verify(p, gw)) return new Response("Invalid signature", { status: 400 });
  const signed = signResult(gw, p, result === "ok");
  await handleIpn(signed, gw);
  const back = new URL(p.vpc_ReturnURL);
  for (const [k, v] of Object.entries(signed)) back.searchParams.set(k, v);
  return NextResponse.redirect(back, 303);
}
