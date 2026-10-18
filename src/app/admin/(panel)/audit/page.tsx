import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { adminT } from "../../i18n";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireAdmin("audit");
  const t = adminT(user.locale);
  const { q } = await searchParams;
  const rows = await db.auditLog.findMany({ where: q ? { OR: [{ actor: { contains: q } }, { action: { contains: q } }, { detail: { contains: q } }] } : {}, orderBy: { createdAt: "desc" }, take: 300 });
  const messages = await db.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.audit}</h1>
      <form><input name="q" defaultValue={q} placeholder="User, action or detail" className="input h-10 min-h-0 w-72" /></form>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Detail</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line"><td className="whitespace-nowrap p-3">{fmtDate(r.createdAt, "en", { hour: "2-digit", minute: "2-digit" })}</td><td className="p-3">{r.actor}</td><td className="p-3"><code>{r.action}</code></td><td className="max-w-md truncate p-3">{r.detail}</td></tr>)}</tbody>
        </table>
      </div>
      <h2 className="text-lg">Customer messages</h2>
      <p className="-mt-4 text-sm text-muted">&quot;logged&quot; means the channel has no API key yet, so the message was recorded but not sent.</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Time</th><th className="p-3">Channel</th><th className="p-3">To</th><th className="p-3">Template</th><th className="p-3">{t.status}</th><th className="p-3">Content</th></tr></thead>
          <tbody>{messages.map((m) => <tr key={m.id} className="border-t border-line"><td className="whitespace-nowrap p-3">{fmtDate(m.createdAt, "en", { hour: "2-digit", minute: "2-digit" })}</td><td className="p-3">{m.channel}</td><td className="p-3">{m.to}</td><td className="p-3">{m.template}</td><td className="p-3">{m.status}</td><td className="max-w-sm truncate p-3" title={m.content}>{m.content}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
