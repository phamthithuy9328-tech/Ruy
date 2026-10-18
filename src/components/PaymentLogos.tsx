// Text badges as stand-ins; swap for official logo files from OnePay's merchant kit.
const logos = ["OnePay", "VISA", "Mastercard", "JCB", "AMEX", "NAPAS", "VietQR"];
export function PaymentLogos({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Payment methods">
      {logos.map((l) => (
        <li key={l} className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-ink">{l}</li>
      ))}
    </ul>
  );
}
