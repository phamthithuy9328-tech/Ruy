import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { extraLocales } from "../../forms";
import { adminT } from "../../i18n";

export default async function Posts() {
  const user = await requireAdmin("posts");
  const t = adminT(user.locale);
  const posts = await db.post.findMany({ orderBy: { publishedAt: "desc" } });
  const now = new Date();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t.posts}</h1>
        {user.role !== "translator" && <Link href="/admin/posts/new" className="btn btn-primary h-10 min-h-0 text-sm">{t.new}</Link>}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Publish date</th><th className="p-3">Translations</th><th className="p-3">{t.status}</th></tr></thead>
          <tbody>
            {posts.map((p) => {
              const tr = (p.tr ?? {}) as Record<string, Record<string, unknown>>;
              return (
                <tr key={p.id} className="border-t border-line">
                  <td className="p-3"><Link href={`/admin/posts/${p.id}`} className="font-medium text-primary">{p.title}</Link><br /><span className="text-xs text-muted">/blog/{p.slug}</span></td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{fmtDate(p.publishedAt, "en")}</td>
                  <td className="p-3">{extraLocales.map((l) => <span key={l} className={`mr-1 rounded px-1.5 text-xs ${tr[l]?.title ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.toUpperCase()}</span>)}</td>
                  <td className="p-3">{!p.published ? "Draft" : p.publishedAt > now ? "Scheduled" : "Published"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
