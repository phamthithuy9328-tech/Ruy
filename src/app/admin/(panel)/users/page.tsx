import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, hashPassword, requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

const roles = ["admin", "sales", "editor", "translator"] as const;
const tempPassword = () => crypto.randomBytes(9).toString("base64url");
// Temporary passwords are handed over in a 60-second httpOnly cookie, never in the URL or the database
const handOver = async (pw: string) => (await cookies()).set("amgo_tmp_pw", pw, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/admin/users", maxAge: 60 });
const roleHelp = "admin: everything · sales: bookings, customers, promo codes · editor: tours, guides, reviews, templates · translator: translations only";

export default async function Users({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("users");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  const shownPw = sp.ok ? (await cookies()).get("amgo_tmp_pw")?.value : undefined;

  async function create(fd: FormData) {
    "use server";
    const u = await requireAdmin("users");
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const role = String(fd.get("role"));
    if (!/^\S+@\S+\.\S+$/.test(email) || !(roles as readonly string[]).includes(role)) redirect("/admin/users?error=Check+email+and+role");
    if (await db.adminUser.findUnique({ where: { email } })) redirect("/admin/users?error=Email+already+exists");
    const pw = tempPassword();
    await db.adminUser.create({ data: { email, name: String(fd.get("name") || email), role, passwordHash: hashPassword(pw), locale: String(fd.get("locale") || "en") } });
    await audit(u.email, "user.create", `${email} (${role})`);
    // The temporary password is shown once on the next screen and never stored in plain text
    await handOver(pw);
    redirect(`/admin/users?ok=${encodeURIComponent(`Created ${email}. Temporary password (visible for 1 minute, ask them to change it under My account):`)}`);
  }
  async function act(fd: FormData) {
    "use server";
    const u = await requireAdmin("users");
    const id = Number(fd.get("id"));
    const op = String(fd.get("op"));
    const target = await db.adminUser.findUniqueOrThrow({ where: { id } });
    if (target.id === u.id && op !== "reset") redirect("/admin/users?error=Use+My+account+to+change+yourself");
    if (op === "role") {
      const role = String(fd.get("role"));
      if ((roles as readonly string[]).includes(role)) await db.adminUser.update({ where: { id }, data: { role } });
    }
    if (op === "toggle") await db.adminUser.update({ where: { id }, data: { active: !target.active } });
    if (op === "reset2fa") await db.adminUser.update({ where: { id }, data: { totpSecret: null } });
    if (op === "reset") {
      const pw = tempPassword();
      await db.adminUser.update({ where: { id }, data: { passwordHash: hashPassword(pw) } });
      await audit(u.email, "user.reset_password", target.email);
      await handOver(pw);
      redirect(`/admin/users?ok=${encodeURIComponent(`New temporary password for ${target.email} (visible for 1 minute):`)}`);
    }
    await audit(u.email, `user.${op}`, target.email);
    redirect("/admin/users?ok=Saved");
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.users}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      {shownPw && <p className="rounded-lg bg-surface p-3 font-mono text-lg">{shownPw}</p>}
      <form action={create} className="grid gap-2 rounded-xl border border-line bg-white p-5 md:grid-cols-5">
        <label className="label">Email<input name="email" type="email" required className="input mt-1" /></label>
        <label className="label">Name<input name="name" className="input mt-1" /></label>
        <label className="label">Role<select name="role" className="input mt-1">{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label className="label">Admin language<select name="locale" className="input mt-1"><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
        <button className="btn btn-primary self-end">{t.new}</button>
        <p className="text-xs text-muted md:col-span-5">{roleHelp}</p>
      </form>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">2FA</th><th className="p-3">Last login</th><th className="p-3">{t.actions}</th></tr></thead>
          <tbody>
            {users.map((x) => (
              <tr key={x.id} className={`border-t border-line ${x.active ? "" : "opacity-50"}`}>
                <td className="p-3">{x.name}<br /><span className="text-xs text-muted">{x.email}</span></td>
                <td className="p-3">
                  <form action={act} className="flex gap-2"><input type="hidden" name="id" value={x.id} /><input type="hidden" name="op" value="role" />
                    <select name="role" defaultValue={x.role} className="input h-9 min-h-0 w-32">{roles.map((r) => <option key={r}>{r}</option>)}</select><button className="text-primary">{t.save}</button>
                  </form>
                </td>
                <td className="p-3">{x.totpSecret ? "On" : "Off"}</td>
                <td className="p-3">{x.lastLoginAt ? fmtDate(x.lastLoginAt, "en", { hour: "2-digit", minute: "2-digit" }) : "–"}</td>
                <td className="p-3">
                  <form action={act} className="flex flex-wrap gap-3"><input type="hidden" name="id" value={x.id} />
                    <button name="op" value="reset" className="text-primary">Reset password</button>
                    {x.totpSecret && <button name="op" value="reset2fa" className="text-ink">Reset 2FA</button>}
                    <button name="op" value="toggle" className="text-danger">{x.active ? "Deactivate" : "Activate"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
