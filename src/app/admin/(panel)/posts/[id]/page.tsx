import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/format";
import { durationSlugs, postCategorySlugs } from "@/lib/taxonomy";
import { Fields, Flash, readFields, type FieldDef } from "../../../forms";

const content: FieldDef[] = [
  { name: "title", label: "Title", tr: true, required: true },
  { name: "excerpt", label: "Excerpt", kind: "textarea", tr: true, required: true },
  { name: "content", label: "Body (Markdown)", kind: "textarea", tr: true, rows: 22, required: true },
  { name: "seoTitle", label: "SEO title", tr: true },
  { name: "seoDesc", label: "SEO description", kind: "textarea", tr: true, rows: 2 },
];

export default async function PostEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("posts");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  if (isNew && user.role === "translator") redirect("/admin/posts");
  const post = isNew ? null : await db.post.findUnique({ where: { id: Number(id) } });
  if (!isNew && !post) notFound();
  const destinations = await db.destination.findMany({ orderBy: { name: "asc" }, select: { slug: true } });
  const settings: FieldDef[] = [
    { name: "slug", label: "URL slug", hint: "Leave empty to generate from the title." },
    { name: "category", label: "Category", kind: "select", options: postCategorySlugs, required: true },
    { name: "destinationSlug", label: "Destination", kind: "select", options: destinations.map((d) => d.slug) },
    { name: "durationSlug", label: "Trip length", kind: "select", options: durationSlugs },
    { name: "image", label: "Cover image URL", required: true },
    { name: "tags", label: "Tags", kind: "json", rows: 3 },
    { name: "author", label: "Author", required: true },
    { name: "publishedAt", label: "Publish date", kind: "date", hint: "A future date schedules the post." },
    { name: "published", label: "Published", kind: "bool" },
  ];
  const locked = user.role === "translator";
  const row = (post ?? { tags: [], author: user.name, publishedAt: new Date(), published: false, category: "travel-tips", image: "/images/hero-1.svg" }) as unknown as Record<string, unknown>;

  async function save(fd: FormData) {
    "use server";
    const u = await requireAdmin("posts");
    const lock = u.role === "translator";
    const cur = isNew ? null : await db.post.findUniqueOrThrow({ where: { id: Number(id) } });
    let target = id;
    try {
      const { data, tr } = readFields(fd, [...content, ...settings], cur as unknown as Record<string, unknown> | null, lock);
      if (lock) await db.post.update({ where: { id: cur!.id }, data: { tr } });
      else {
        data.slug = slugify(String(data.slug || data.title));
        const all = { tags: [], ...data, publishedAt: data.publishedAt ?? new Date(), tr } as never;
        if (cur) {
          await db.post.update({ where: { id: cur.id }, data: all });
          if (cur.slug !== data.slug) for (const p of ["", "/vi"]) await db.redirect.upsert({ where: { from: `${p}/blog/${cur.slug}` }, update: { to: `${p}/blog/${data.slug}` }, create: { from: `${p}/blog/${cur.slug}`, to: `${p}/blog/${data.slug}` } });
        } else target = String((await db.post.create({ data: all })).id);
      }
      await audit(u.email, isNew ? "post.create" : "post.update", String(data.slug ?? cur?.slug));
    } catch (e) {
      redirect(`/admin/posts/${id}?error=${encodeURIComponent(e instanceof Error ? e.message.split("\n").pop()! : "Could not save")}`);
    }
    redirect(`/admin/posts/${target}?ok=Saved`);
  }

  const box = "rounded-xl border border-line bg-white p-5";
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/posts" className="text-sm text-muted">← Travel guides</Link>
        <h1 className="mt-1 text-2xl">{post?.title ?? "New guide"}</h1>
        {post && <a href={`/blog/${post.slug}`} target="_blank" className="text-sm text-primary">View on site ↗</a>}
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={save} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className={box}>
          <p className="mb-4 text-xs text-muted">Markdown: <code>## Heading</code>, <code>- list item</code>, <code>**bold**</code>, <code>[text](url)</code>, and <code>[[tour:slug]]</code> to embed a tour card.</p>
          <Fields defs={content} row={row} baseLocked={locked} />
        </div>
        <div className="grid content-start gap-6">
          <div className={box}><Fields defs={settings} row={row} baseLocked={locked} /></div>
          <button className="btn btn-primary">Save guide</button>
        </div>
      </form>
    </div>
  );
}
