import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { audit, checkPassword, createSession, verifyTotp } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;

  async function login(fd: FormData) {
    "use server";
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60_000)) redirect("/admin/login?e=rate");
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const user = await db.adminUser.findUnique({ where: { email } });
    if (!user || !user.active || !checkPassword(String(fd.get("password") ?? ""), user.passwordHash)) redirect("/admin/login?e=bad");
    if (user.totpSecret && !verifyTotp(user.totpSecret, String(fd.get("otp") ?? ""))) redirect("/admin/login?e=otp");
    await createSession(user.id);
    await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(user.email, "login", ip);
    redirect("/admin");
  }

  const msg = { bad: "Wrong email or password.", otp: "Invalid 2FA code.", rate: "Too many attempts. Try again in 15 minutes." }[e ?? ""];
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form action={login} className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <p className="text-xl font-bold text-ink">AmGo<span className="text-primary"> Admin</span></p>
        {msg && <p role="alert" className="mt-3 text-sm text-danger">{msg}</p>}
        <label className="label mt-4" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" />
        <label className="label mt-3" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        <label className="label mt-3" htmlFor="otp">2FA code <span className="font-normal text-muted">(if enabled)</span></label>
        <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input" />
        <button className="btn btn-primary mt-5 w-full">Log in</button>
      </form>
    </div>
  );
}
