// OnePay IPN (server-to-server). The ONLY place an order becomes "paid".
import { handleIpn } from "@/lib/booking";
import type { Gateway } from "@/lib/onepay";

async function handle(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  if (req.method === "POST") Object.assign(params, Object.fromEntries(new URLSearchParams(await req.text())));
  const gw = (params.gw === "intl" ? "intl" : "domestic") as Gateway;
  delete params.gw;
  const r = await handleIpn(params, gw);
  // OnePay expects this exact plain-text format
  return new Response(r.ok ? "responsecode=1&desc=confirm-success" : "responsecode=0&desc=confirm-fail", { headers: { "content-type": "text/plain" } });
}
export const GET = handle;
export const POST = handle;
