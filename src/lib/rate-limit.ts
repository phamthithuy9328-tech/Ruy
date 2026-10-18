// Giới hạn tần suất đơn giản theo IP (bộ nhớ). Khi chạy nhiều instance, chuyển sang Redis/Upstash.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
}

/** Xác minh Cloudflare Turnstile nếu đã cấu hình TURNSTILE_SECRET_KEY, ngược lại bỏ qua. */
export async function verifyTurnstile(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
