// Shared admin form building: every translatable field is shown as English (primary) next to one
// column per extra language, so adding a language in i18n/config.ts adds its columns here too.
import type { Prisma } from "@prisma/client";
import { defaultLocale, locales } from "@/i18n/config";

export type FieldDef = {
  name: string;
  label: string;
  kind?: "text" | "textarea" | "json" | "number" | "date" | "bool" | "select";
  rows?: number;
  tr?: boolean; // translatable
  options?: readonly string[];
  hint?: string;
  required?: boolean;
};

export const extraLocales = locales.filter((l) => l !== defaultLocale);

type Row = Record<string, unknown> & { tr?: unknown };

const show = (v: unknown, kind: FieldDef["kind"]) => {
  if (v === null || v === undefined) return "";
  if (kind === "json") return JSON.stringify(v, null, 2);
  if (kind === "date" && v instanceof Date) return v.toISOString().slice(0, 16);
  return String(v);
};

function Input({ def, name, value, disabled }: { def: FieldDef; name: string; value: unknown; disabled?: boolean }) {
  const common = { name, disabled, className: "input mt-1", required: def.required && !disabled };
  if (def.kind === "bool") return <input type="checkbox" name={name} defaultChecked={!!value} disabled={disabled} className="ml-2 size-4 accent-primary" />;
  if (def.kind === "select")
    return (
      <select {...common} defaultValue={show(value, "text")}>
        {!def.required && <option value="">–</option>}
        {def.options!.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  if (def.kind === "textarea" || def.kind === "json")
    return <textarea {...common} rows={def.rows ?? (def.kind === "json" ? 8 : 3)} defaultValue={show(value, def.kind)} className={`input mt-1 h-auto py-2 ${def.kind === "json" ? "font-mono text-xs" : ""}`} />;
  return <input {...common} type={def.kind === "number" ? "number" : def.kind === "date" ? "datetime-local" : "text"} defaultValue={show(value, def.kind)} />;
}

/** baseLocked: translators see the English text but can only edit translations */
export function Fields({ defs, row, baseLocked }: { defs: FieldDef[]; row: Row | null; baseLocked?: boolean }) {
  const tr = (row?.tr ?? {}) as Record<string, Record<string, unknown>>;
  return (
    <div className="grid gap-4">
      {defs.map((d) =>
        d.tr ? (
          <div key={d.name} className={`grid gap-3 ${extraLocales.length ? "lg:grid-cols-2" : ""}`}>
            <label className="label">{d.label} <span className="text-xs font-normal text-muted">EN</span><Input def={d} name={`f_${d.name}`} value={row?.[d.name]} disabled={baseLocked} /></label>
            {extraLocales.map((l) => (
              <label key={l} className="label">{d.label} <span className="text-xs font-normal text-muted">{l.toUpperCase()}</span><Input def={{ ...d, required: false }} name={`tr_${l}_${d.name}`} value={tr[l]?.[d.name]} /></label>
            ))}
          </div>
        ) : (
          <label key={d.name} className={`label ${d.kind === "bool" ? "flex items-center" : ""}`}>
            {d.label}
            <Input def={d} name={`f_${d.name}`} value={row?.[d.name]} disabled={baseLocked} />
            {d.hint && <span className="mt-1 block text-xs font-normal text-muted">{d.hint}</span>}
          </label>
        ),
      )}
    </div>
  );
}

function parse(raw: FormDataEntryValue | null, def: FieldDef): unknown {
  if (def.kind === "bool") return raw === "on";
  const s = raw === null ? "" : String(raw).trim();
  if (s === "") return def.kind === "json" ? undefined : def.kind === "number" || def.kind === "date" || def.kind === "select" ? null : "";
  if (def.kind === "number") return Number(s);
  if (def.kind === "date") return new Date(s);
  if (def.kind === "json") {
    try {
      return JSON.parse(s);
    } catch {
      throw new Error(`${def.label}: invalid JSON`);
    }
  }
  return s;
}

/** Reads base fields (unless baseLocked) and translations. Throws Error with a readable message. */
export function readFields(fd: FormData, defs: FieldDef[], current: Row | null, baseLocked?: boolean) {
  const data: Record<string, unknown> = {};
  if (!baseLocked)
    for (const d of defs) {
      const v = parse(fd.get(`f_${d.name}`), d);
      if (d.required && (v === "" || v === null || v === undefined)) throw new Error(`${d.label} is required`);
      if (v !== undefined) data[d.name] = v;
    }
  const tr: Record<string, Record<string, unknown>> = { ...((current?.tr ?? {}) as Record<string, Record<string, unknown>>) };
  for (const l of extraLocales) {
    const t: Record<string, unknown> = {};
    for (const d of defs.filter((x) => x.tr)) {
      const v = parse(fd.get(`tr_${l}_${d.name}`), d);
      if (v !== undefined && v !== "" && v !== null) t[d.name] = v;
    }
    tr[l] = t;
  }
  return { data, tr: tr as Prisma.InputJsonObject };
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>;
  if (ok) return <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">{ok}</p>;
  return null;
}
