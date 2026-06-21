import type { Mapping, Reimbursement, ReimbStatus } from "./types";

function parseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  // Try ISO first
  const iso = new Date(t);
  if (!isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(t)) return iso;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const dt = new Date(year, Number(mo) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
  }
  if (!isNaN(iso.getTime())) return iso;
  return null;
}

function parseAmount(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseStatus(s: string): ReimbStatus {
  const v = (s || "").toLowerCase().trim();
  if (/aprov|pago|approved|paid/.test(v)) return "aprovado";
  if (/rejei|recus|reject|denied/.test(v)) return "rejeitado";
  return "pendente";
}

export function normalize(headers: string[], rows: string[][], mapping: Mapping): Reimbursement[] {
  const idx = (key?: string) => key ? headers.indexOf(key) : -1;
  const i = {
    date: idx(mapping.date),
    amount: idx(mapping.amount),
    department: idx(mapping.department),
    employee: idx(mapping.employee),
    client: idx(mapping.client),
    category: idx(mapping.category),
    status: idx(mapping.status),
    description: idx(mapping.description),
    submittedAt: idx(mapping.submittedAt),
  };
  const out: Reimbursement[] = [];
  rows.forEach((r, n) => {
    const date = i.date >= 0 ? parseDate(r[i.date] ?? "") : null;
    if (!date) return;
    const amount = i.amount >= 0 ? parseAmount(r[i.amount] ?? "") : 0;
    out.push({
      id: `${n}-${date.getTime()}`,
      date,
      amount,
      department: (i.department >= 0 ? r[i.department] : "") || "—",
      employee: (i.employee >= 0 ? r[i.employee] : "") || "—",
      client: (i.client >= 0 ? r[i.client] : "") || "",
      category: (i.category >= 0 ? r[i.category] : "") || "Outros",
      status: parseStatus(i.status >= 0 ? r[i.status] : ""),
      description: (i.description >= 0 ? r[i.description] : "") || "",
      submittedAt: i.submittedAt >= 0 ? (parseDate(r[i.submittedAt] ?? "") ?? undefined) : undefined,
    });
  });
  return out;
}
