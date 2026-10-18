import Link from "next/link";
import { redirect } from "next/navigation";
import { access, COOKIE, currentAdmin, type Role } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminT } from "../i18n";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  const t = adminT(user.locale);
  const items = (Object.keys(access) as (keyof typeof access)[]).filter((k) => access[k].includes(user.role as Role));
  const href = (k: string) => (k === "dashboard" ? "/admin" : `/admin/${k}`);

  async function logout() {
    "use server";
    (await cookies()).delete(COOKIE);
    redirect("/admin/login");
  }
  async function toggleLang() {
    "use server";
    await db.adminUser.update({ where: { id: user!.id }, data: { locale: user!.locale === "vi" ? "en" : "vi" } });
    redirect("/admin");
  }

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="font-bold text-ink">AmGo<span className="text-primary"> Admin</span></Link>
          <form action={toggleLang}><button className="rounded border border-line px-2 text-xs">{user.locale === "vi" ? "EN" : "VI"}</button></form>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-0.5">
          {items.map((k) => (
            <Link key={k} href={href(k)} className="block shrink-0 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface">{t[k as keyof typeof t]}</Link>
          ))}
        </nav>
        <div className="hidden border-t border-line p-4 text-xs text-muted lg:block">
          <p className="font-medium text-ink">{user.name}</p>
          <p>{user.email} · {user.role}</p>
          <div className="mt-2 flex gap-3">
            <Link href="/" target="_blank" className="text-primary">{t.viewSite}</Link>
            <form action={logout}><button className="text-danger">{t.logout}</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
