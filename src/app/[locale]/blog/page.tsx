import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PostCard } from "@/components/PostCard";
import { BlogHeader } from "@/components/BlogHeader";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { getPosts } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  const d = getDict(locale).blog;
  return pageMeta({ locale, path: "/blog", title: d.title, description: d.subtitle });
}

export default async function BlogIndex({ params }: P) {
  const { locale } = await params;
  const d = getDict(locale);
  const posts = await getPosts();
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.blog.title }]} />
      <header className="container-x mb-6">
        <h1 className="text-[32px]">{d.blog.title}</h1>
        <p className="mt-1 text-muted">{d.blog.subtitle}</p>
      </header>
      <BlogHeader locale={locale} active="" />
      <div className="container-x grid gap-4 pb-8 md:grid-cols-3">
        {posts.map((p) => <PostCard key={p.slug} post={p} locale={locale} />)}
      </div>
    </>
  );
}
