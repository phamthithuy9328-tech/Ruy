import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, checkPassword, hashPassword, newTotpSecret, requireAdmin, verifyTotp } from "@/lib/admin-auth";
import { safeEqual, sign } from "@/lib/tokens";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

export default async function Account({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; setup?: string }> }) {
  const user = await requireAdmin("account");
  const t = adminT(user.locale);
  const sp = await searchParams;
  // 2FA setup: a fresh secret travels in a signed hidden field until the user proves their app works
  const secret = sp.setup && !user.totpSecret ? newTotpSecret() : null;
  const uri = secret ? `otpauth://totp/AmGo%20Admin:${encodeURIComponent(user.email)}?secret=${secret}&issuer=AmGo%20Travel` : null;

  async function changePassword(fd: FormData) {
    "use server";
    const u = await requireAdmin("account");
    const next = String(fd.get("next") ?? "");
    if (!checkPassword(String(fd.get("current") ?? ""), u.passwordHash)) redirect("/admin/account?error=Current+password+is+wrong");
    if (next.length < 12) redirect("/admin/account?error=Use+at+least+12+characters");
    await db.adminUser.update({ where: { id: u.id }, data: { passwordHash: hashPassword(next) } });
    await audit(u.email, "account.password", "");
    redirect("/admin/account?ok=Password+changed");
  }
  async function enable2fa(fd: FormData) {
    "use server";
    const u = await requireAdmin("account");
    const s = String(fd.get("secret") ?? "");
    if (!safeEqual(String(fd.get("sig") ?? ""), sign(`totp:${u.id}:${s}`))) redirect("/admin/account?error=Setup+expired");
    if (!verifyTotp(s, String(fd.get("code") ?? ""))) redirect("/admin/account?setup=1&error=Code+did+not+match,+scan+the+new+key");
    await db.adminUser.update({ where: { id: u.id }, data: { totpSecret: s } });
    await audit(u.email, "account.2fa_on", "");
    redirect("/admin/account?ok=Two-factor+authentication+is+on");
  }
  async function disable2fa(fd: FormData) {
    "use server";
    const u = await requireAdmin("account");
    if (!u.totpSecret || !verifyTotp(u.totpSecret, String(fd.get("code") ?? ""))) redirect("/admin/account?error=Invalid+code");
    await db.adminUser.update({ where: { id: u.id }, data: { totpSecret: null } });
    await audit(u.email, "account.2fa_off", "");
    redirect("/admin/account?ok=Two-factor+authentication+is+off");
  }

  const box = "rounded-xl border border-line bg-white p-5";
  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl">{t.account}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={changePassword} className={`${box} grid gap-3`}>
        <h2 className="text-lg">Password</h2>
        <label className="label">Current password<input name="current" type="password" required autoComplete="current-password" className="input mt-1" /></label>
        <label className="label">New password (12+ characters)<input name="next" type="password" required minLength={12} autoComplete="new-password" className="input mt-1" /></label>
        <button className="btn btn-primary justify-self-start">{t.save}</button>
      </form>
      <div className={box}>
        <h2 className="text-lg">Two-factor authentication</h2>
        {user.totpSecret ? (
          <form action={disable2fa} className="mt-3 flex flex-wrap items-end gap-2">
            <p className="w-full text-sm text-success">On. You&apos;ll be asked for a code from your authenticator app at login.</p>
            <label className="label">Current code<input name="code" inputMode="numeric" maxLength={6} required className="input mt-1 w-36" /></label>
            <button className="btn btn-outline">Turn off</button>
          </form>
        ) : secret ? (
          <form action={enable2fa} className="mt-3 grid gap-3">
            <p className="text-sm">Add this key to Google Authenticator, 1Password or Authy (choose &quot;enter a setup key&quot;), then type the 6-digit code.</p>
            <code className="rounded-lg bg-surface p-3 text-lg tracking-widest">{secret.match(/.{4}/g)!.join(" ")}</code>
            <a href={uri!} className="text-sm text-primary">Open in authenticator app (on this device)</a>
            <input type="hidden" name="secret" value={secret} /><input type="hidden" name="sig" value={sign(`totp:${user.id}:${secret}`)} />
            <label className="label">Code<input name="code" inputMode="numeric" maxLength={6} required className="input mt-1 w-36" /></label>
            <button className="btn btn-primary justify-self-start">Turn on</button>
          </form>
        ) : (
          <div className="mt-3"><p className="text-sm text-muted">Off. Strongly recommended for admin and sales accounts.</p><a href="?setup=1" className="btn btn-primary mt-3">Set up</a></div>
        )}
      </div>
    </div>
  );
}
