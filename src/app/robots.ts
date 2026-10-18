import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/book/", "/payment/", "/voucher/", "/vi/book/", "/vi/payment/", "/vi/voucher/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
