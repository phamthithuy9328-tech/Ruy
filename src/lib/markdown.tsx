// Minimal, safe Markdown → React (no raw HTML): ## / ### headings, paragraphs, - lists, | tables |,
// **bold**, [links](url) and [[tour:slug]] embeds. Editors write posts in this format in the admin.
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { slugify } from "./format";

export type Block =
  | { type: "h2" | "h3"; text: string; id: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "tour"; slug: string };

export function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const tour = l.match(/^\[\[tour:([a-z0-9-]+)\]\]$/);
    if (tour) blocks.push({ type: "tour", slug: tour[1] });
    else if (l.startsWith("### ")) blocks.push({ type: "h3", text: l.slice(4), id: slugify(l.slice(4)) });
    else if (l.startsWith("## ")) blocks.push({ type: "h2", text: l.slice(3), id: slugify(l.slice(3)) });
    else if (l.startsWith("- ")) {
      const items = [l.slice(2)];
      while (lines[i + 1]?.trim().startsWith("- ")) items.push(lines[++i].trim().slice(2));
      blocks.push({ type: "ul", items });
    } else if (l.startsWith("|")) {
      const rows = [l];
      while (lines[i + 1]?.trim().startsWith("|")) rows.push(lines[++i].trim());
      const cells = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      blocks.push({ type: "table", head: cells(rows[0]), rows: rows.slice(2).map(cells) });
    } else {
      const para = [l];
      while (lines[i + 1]?.trim() && !/^(#|- |\||\[\[)/.test(lines[i + 1].trim())) para.push(lines[++i].trim());
      blocks.push({ type: "p", text: para.join(" ") });
    }
  }
  return blocks;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    const bold = p.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="text-ink">{bold[1]}</strong>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const safe = /^(https?:\/\/|\/)/.test(href) ? href : "#";
      return safe.startsWith("/") ? <Link key={i} href={safe} className="text-primary underline">{link[1]}</Link> : <a key={i} href={safe} rel="noopener nofollow" target="_blank" className="text-primary underline">{link[1]}</a>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ blocks, renderTour }: { blocks: Block[]; renderTour: (slug: string) => ReactNode }) {
  return (
    <div className="prose-amgo">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2": return <h2 key={i} id={b.id}>{b.text}</h2>;
          case "h3": return <h3 key={i} id={b.id}>{b.text}</h3>;
          case "p": return <p key={i}>{inline(b.text)}</p>;
          case "ul": return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
          case "table":
            return (
              <div key={i} className="overflow-x-auto">
                <table><thead><tr>{b.head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead><tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table>
              </div>
            );
          case "tour": return <div key={i} className="not-prose my-6 max-w-sm">{renderTour(b.slug)}</div>;
        }
      })}
    </div>
  );
}
