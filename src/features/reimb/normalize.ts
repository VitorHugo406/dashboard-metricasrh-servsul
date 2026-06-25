import type { Mapping, Reimbursement, ReimbStatus } from "./types";

function makeLocalDate(year: number, month: number, day: number): Date | null {
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day)
    return null;
  return dt;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string | null | undefined): Date | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  // Excel serial number
  if (/^\d{4,6}(\.\d+)?$/.test(t)) {
    const n = Number(t);
    // Excel epoch 1899-12-30
    const utc = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    if (!isNaN(utc.getTime()))
      return makeLocalDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return makeLocalDate(year, month, day);
  }
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const [, a, b, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const first = Number(a);
    const second = Number(b);
    const monthFirst = first <= 12 && second > 12;
    const day = monthFirst ? second : first;
    const month = monthFirst ? first : second;
    return makeLocalDate(year, month, day);
  }
  return null;
}

export function parseAmount(s: string | null | undefined): number {
  if (s == null) return 0;
  const raw = String(s).trim();
  if (!raw) return 0;
  // Brazilian format: 1.234,56 -> 1234.56
  let cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (cleaned.indexOf(",") > -1) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function parseStatus(s: string | null | undefined): ReimbStatus {
  const v = String(s ?? "").toLowerCase().trim();
  // "Realizado" = paid out
  if (/realiz|pago|paid|conclu[ií]d|efetuad|liquidad|finaliz/.test(v)) return "realizado";
  // default = pendente
  return "pendente";
}

export function normalize(headers: string[], rows: string[][], mapping: Mapping): Reimbursement[] {
  const idx = (key?: string) => (key ? headers.indexOf(key) : -1);
  const i = {
    date: idx(mapping.date),
    amount: idx(mapping.amount),
    department: idx(mapping.department),
    employee: idx(mapping.employee),
    client: idx(mapping.client),
    category: idx(mapping.category),
    status: idx(mapping.status),
    description: idx(mapping.description),
    observacao: idx(mapping.observacao),
    submittedAt: idx(mapping.submittedAt),
  };
  const get = (r: string[], k: number) => (k >= 0 ? r[k] ?? "" : "");
  const out: Reimbursement[] = [];
  const mappedKeys = Object.values(mapping).filter(Boolean).join("|");
  rows.forEach((r, n) => {
    const date = parseDate(get(r, i.date));
    if (!date) return;
    out.push({
      id: `r-${n}-${toISODate(date)}-${Math.abs(`${mappedKeys}|${r.join("|")}`.split("").reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0))}`,
      date,
      amount: parseAmount(get(r, i.amount)),
      department: get(r, i.department) || "—",
      employee: get(r, i.employee) || "—",
      client: get(r, i.client) || "",
      category: get(r, i.category) || "Outros",
      status: parseStatus(get(r, i.status)),
      description: get(r, i.description) || "",
      observacao: get(r, i.observacao) || "",
      submittedAt: parseDate(get(r, i.submittedAt)) ?? undefined,
    });
  });
  return out;
}
