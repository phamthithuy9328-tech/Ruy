// Automated customer messages from editable templates (Admin › Message templates), in the customer's language.
// Channels: email (Resend), WhatsApp (Cloud API), Zalo ZNS (Vietnamese customers), SMS (eSMS) as fallback.
// Without API keys messages are only logged, so flows can be tested safely.
import "server-only";
import { db } from "./db";

export function render(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "logged";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "AmGo Travel <booking@amgotravel.com>", to, subject, text }),
  });
  return res.ok ? "sent" : "failed";
}

async function sendWhatsapp(to: string, text: string) {
  // Free-form text works inside the 24h service window; business-initiated messages need an approved
  // template (set WHATSAPP_TEMPLATE_<KEY>) – extend here once templates are approved by Meta.
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return "logged";
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body: text } }),
  });
  return res.ok ? "sent" : "failed";
}

async function sendZalo(to: string, templateKey: string, vars: Record<string, string | number>) {
  // Zalo ZNS requires approved templates: ZALO_ZNS_TEMPLATES='{"booking_confirmation_chat":"123456"}'
  const token = process.env.ZALO_ZNS_ACCESS_TOKEN;
  const map = JSON.parse(process.env.ZALO_ZNS_TEMPLATES ?? "{}") as Record<string, string>;
  if (!token || !map[templateKey]) return null;
  const res = await fetch("https://business.openapi.zalo.me/message/template", {
    method: "POST",
    headers: { access_token: token, "content-type": "application/json" },
    body: JSON.stringify({ phone: to.replace(/^\+/, ""), template_id: map[templateKey], template_data: vars }),
  });
  return res.ok ? "sent" : "failed";
}

async function sendSms(to: string, text: string) {
  const key = process.env.ESMS_API_KEY;
  if (!key) return "logged";
  const res = await fetch("https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ApiKey: key, SecretKey: process.env.ESMS_SECRET_KEY, Phone: to, Content: text, Brandname: process.env.ESMS_BRANDNAME, SmsType: "2" }),
  });
  return res.ok ? "sent" : "failed";
}

export async function notify(templateKey: string, to: { email?: string | null; phone?: string | null; locale?: string }, vars: Record<string, string | number>) {
  const locale = to.locale ?? "en";
  const t =
    (await db.messageTemplate.findUnique({ where: { key_locale: { key: templateKey, locale } } })) ??
    (await db.messageTemplate.findUnique({ where: { key_locale: { key: templateKey, locale: "en" } } }));
  if (!t || !t.active) return;
  const content = render(t.body, vars);
  const phone = to.phone && !to.phone.startsWith("email:") ? to.phone : null;
  const target = t.channel === "email" ? to.email : phone;
  if (!target) return;
  let status = "failed";
  let channel = t.channel;
  try {
    if (t.channel === "email") status = await sendEmail(target, render(t.subject ?? t.name, vars), content);
    else if (t.channel === "whatsapp") status = await sendWhatsapp(target, content);
    else if (t.channel === "zalo") {
      const z = await sendZalo(target, templateKey, vars);
      if (z) status = z;
      else {
        channel = "sms";
        status = await sendSms(target, content);
      }
    } else status = await sendSms(target, content);
  } catch {
    status = "failed";
  }
  await db.messageLog.create({ data: { channel, to: target, template: `${templateKey}:${t.locale}`, content, status } });
}
