// Built-in OnePay simulator (ONEPAY_MODE=mock) so the whole flow can be demoed without merchant credentials.
import { notFound } from "next/navigation";
import { onepayMode, verify, type Gateway } from "@/lib/onepay";
import { formatMoney } from "@/lib/currency";

export const metadata = { robots: { index: false } };

export default async function Simulator({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (onepayMode !== "mock") notFound();
  const p = await searchParams;
  const gw: Gateway = p.vpc_ReturnURL?.includes("gw=intl") ? "intl" : "domestic";
  if (!verify(p, gw)) return <p className="container-x py-20">Invalid signature</p>;

  const amount = Number(p.vpc_Amount) / 100;
  return (
    <div className="grid min-h-[70vh] place-items-center bg-surface px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs font-bold uppercase tracking-widest text-warning">OnePay · test simulator</p>
        <h1 className="mt-2 text-2xl">{formatMoney(amount, p.vpc_Currency, "en")}</h1>
        <dl className="mt-4 grid gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Merchant ref</dt><dd className="font-mono">{p.vpc_MerchTxnRef}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Gateway</dt><dd>{gw === "intl" ? "International cards" : "Domestic / QR"} ({p.vpc_CardList})</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Currency</dt><dd>{p.vpc_Currency}</dd></div>
        </dl>
        <p className="mt-4 rounded-lg bg-surface p-3 text-xs text-muted">This page stands in for OnePay&apos;s hosted payment page. Set ONEPAY_MODE=sandbox to use the real OnePay test gateway.</p>
        <form method="post" action="/api/onepay/simulate" className="mt-5 grid gap-2">
          {Object.entries(p).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button name="result" value="ok" className="btn btn-primary">Approve payment</button>
          <button name="result" value="fail" className="btn btn-outline">Decline / cancel</button>
        </form>
      </div>
    </div>
  );
}
