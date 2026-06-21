import type { ComparisonMode, DateRange, Filters, Reimbursement } from "./types";

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const fmtBRLDec = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
export function startOfWeek(d: Date) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
export function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); }

export function getComparisonRanges(mode: ComparisonMode, custom?: { current: DateRange; previous: DateRange }, now = new Date()): { current: DateRange; previous: DateRange; label: string } {
  switch (mode) {
    case "wow": {
      const cs = startOfWeek(now);
      const current = { from: cs, to: endOfDay(addDays(cs, 6)) };
      const ps = addDays(cs, -7);
      return { current, previous: { from: ps, to: endOfDay(addDays(ps, 6)) }, label: "Esta semana vs. semana anterior" };
    }
    case "mom": {
      const cs = startOfMonth(now);
      const ps = startOfMonth(addDays(cs, -1));
      return { current: { from: cs, to: endOfMonth(now) }, previous: { from: ps, to: endOfMonth(ps) }, label: "Este mês vs. mês anterior" };
    }
    case "yoy": {
      const cs = startOfMonth(now);
      const ps = new Date(cs.getFullYear() - 1, cs.getMonth(), 1);
      return { current: { from: cs, to: endOfMonth(now) }, previous: { from: ps, to: endOfMonth(ps) }, label: "Este mês vs. mesmo mês do ano anterior" };
    }
    case "30d": {
      const to = endOfDay(now);
      const from = startOfDay(addDays(to, -29));
      const pTo = endOfDay(addDays(from, -1));
      const pFrom = startOfDay(addDays(pTo, -29));
      return { current: { from, to }, previous: { from: pFrom, to: pTo }, label: "Últimos 30 dias vs. 30 dias anteriores" };
    }
    case "90d": {
      const to = endOfDay(now);
      const from = startOfDay(addDays(to, -89));
      const pTo = endOfDay(addDays(from, -1));
      const pFrom = startOfDay(addDays(pTo, -89));
      return { current: { from, to }, previous: { from: pFrom, to: pTo }, label: "Últimos 90 dias vs. 90 dias anteriores" };
    }
    case "custom": {
      if (custom) return { ...custom, label: "Período personalizado" };
      return getComparisonRanges("mom", undefined, now);
    }
  }
}

export function inRange(d: Date, r: DateRange) { return d >= r.from && d <= r.to; }

export function applyFilters(items: Reimbursement[], f: Filters): Reimbursement[] {
  return items.filter(i => {
    if (f.range && !inRange(i.date, f.range)) return false;
    if (f.department && i.department !== f.department) return false;
    if (f.category && i.category !== f.category) return false;
    if (f.client && i.client !== f.client) return false;
    if (f.status && i.status !== f.status) return false;
    if (f.search) {
      const s = f.search.toLowerCase();
      const hay = `${i.employee} ${i.department} ${i.category} ${i.client} ${i.description}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}

export type Kpis = {
  total: number; count: number; approved: number; rejected: number; pending: number;
  approvalRate: number; avgAmount: number; avgApprovalDays: number;
};

export function computeKpis(items: Reimbursement[]): Kpis {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const approved = items.filter(i => i.status === "aprovado").length;
  const rejected = items.filter(i => i.status === "rejeitado").length;
  const pending = items.filter(i => i.status === "pendente").length;
  const decided = approved + rejected;
  const approvalRate = decided ? (approved / decided) * 100 : 0;
  const avgAmount = items.length ? total / items.length : 0;
  const approvedWithDates = items.filter(i => i.status === "aprovado" && i.submittedAt);
  const avgApprovalDays = approvedWithDates.length
    ? approvedWithDates.reduce((s, i) => s + (i.date.getTime() - (i.submittedAt!.getTime())) / 86400000, 0) / approvedWithDates.length
    : 0;
  return { total, count: items.length, approved, rejected, pending, approvalRate, avgAmount, avgApprovalDays };
}

export function deltaPct(curr: number, prev: number): number {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export function groupByMonth(items: Reimbursement[]): { label: string; total: number; approved: number; rejected: number; count: number }[] {
  const map = new Map<string, { label: string; total: number; approved: number; rejected: number; count: number; sortKey: number }>();
  items.forEach(i => {
    const k = `${i.date.getFullYear()}-${String(i.date.getMonth()+1).padStart(2,"0")}`;
    const label = i.date.toLocaleDateString("pt-BR", { month: "short" }).replace(".","").toUpperCase();
    if (!map.has(k)) map.set(k, { label, total: 0, approved: 0, rejected: 0, count: 0, sortKey: i.date.getFullYear()*100 + i.date.getMonth() });
    const g = map.get(k)!;
    g.total += i.amount; g.count++;
    if (i.status === "aprovado") g.approved += i.amount;
    if (i.status === "rejeitado") g.rejected += i.amount;
  });
  return [...map.values()].sort((a,b) => a.sortKey - b.sortKey);
}

export function groupBy<T extends keyof Reimbursement>(items: Reimbursement[], key: T): { label: string; total: number; count: number }[] {
  const map = new Map<string, { label: string; total: number; count: number }>();
  items.forEach(i => {
    const v = String(i[key] ?? "—") || "—";
    if (!map.has(v)) map.set(v, { label: v, total: 0, count: 0 });
    const g = map.get(v)!; g.total += i.amount; g.count++;
  });
  return [...map.values()].sort((a,b) => b.total - a.total);
}

export function uniqueValues<T extends keyof Reimbursement>(items: Reimbursement[], key: T): string[] {
  return [...new Set(items.map(i => String(i[key] ?? "")).filter(Boolean))].sort();
}

export type Insight = {
  id: string;
  severity: "positivo" | "atencao" | "critico" | "info";
  title: string;
  body: string;
  ref?: string;
};

export function generateInsights(all: Reimbursement[], current: DateRange, previous: DateRange, label: string): Insight[] {
  const cur = all.filter(i => inRange(i.date, current));
  const prv = all.filter(i => inRange(i.date, previous));
  const out: Insight[] = [];
  if (!cur.length && !prv.length) return out;

  const curTotal = cur.reduce((s,i) => s+i.amount, 0);
  const prvTotal = prv.reduce((s,i) => s+i.amount, 0);
  const totalDelta = deltaPct(curTotal, prvTotal);
  out.push({
    id: "total",
    severity: totalDelta > 15 ? "atencao" : totalDelta < -5 ? "positivo" : "info",
    title: totalDelta >= 0 ? "Total reembolsado em alta" : "Redução no total reembolsado",
    body: `${fmtBRL(curTotal)} no período (${label.toLowerCase()}). Variação ${fmtPct(totalDelta)} vs. período anterior (${fmtBRL(prvTotal)}).`,
  });

  // Category jumps
  const byCatCur = new Map<string, number>();
  const byCatPrv = new Map<string, number>();
  cur.forEach(i => byCatCur.set(i.category, (byCatCur.get(i.category) ?? 0) + i.amount));
  prv.forEach(i => byCatPrv.set(i.category, (byCatPrv.get(i.category) ?? 0) + i.amount));
  type CatT = { cat: string; delta: number; curr: number };
  let topCat: CatT | null = null;
  byCatCur.forEach((v, k) => {
    const d = deltaPct(v, byCatPrv.get(k) ?? 0);
    const cur = topCat;
    if (v > 0 && (!cur || d > cur.delta)) topCat = { cat: k, delta: d, curr: v };
  });
  const tc: CatT | null = topCat;
  if (tc && tc.delta > 20) {
    out.push({
      id: `cat-${tc.cat}`,
      severity: tc.delta > 50 ? "critico" : "atencao",
      title: `Atenção em "${tc.cat}"`,
      body: `Categoria ${tc.cat} cresceu ${fmtPct(tc.delta)} no período, totalizando ${fmtBRL(tc.curr)}.`,
    });
  }

  // Department approval-rate drop
  type DepT = { dep: string; drop: number; rate: number };
  const deps = new Set([...cur, ...prv].map(i => i.department));
  let worstDep: DepT | null = null;
  deps.forEach(dep => {
    const c = cur.filter(i => i.department === dep);
    const p = prv.filter(i => i.department === dep);
    const cd = c.filter(i => i.status !== "pendente").length;
    const pd = p.filter(i => i.status !== "pendente").length;
    if (cd < 3 || pd < 3) return;
    const cr = c.filter(i => i.status === "aprovado").length / cd * 100;
    const pr = p.filter(i => i.status === "aprovado").length / pd * 100;
    const drop = pr - cr;
    const w = worstDep;
    if (drop > 5 && (!w || drop > w.drop)) worstDep = { dep, drop, rate: cr };
  });
  const wd: DepT | null = worstDep;
  if (wd) {
    out.push({
      id: `dep-${wd.dep}`,
      severity: "atencao",
      title: `Aprovação caiu em ${wd.dep}`,
      body: `Taxa de aprovação caiu ${wd.drop.toFixed(1)} pp, agora em ${wd.rate.toFixed(0)}%. Vale revisar fluxo do departamento.`,
    });
  }

  // Client jump
  type CliT = { client: string; delta: number; curr: number };
  const byClientCur = new Map<string, number>();
  const byClientPrv = new Map<string, number>();
  cur.forEach(i => i.client && byClientCur.set(i.client, (byClientCur.get(i.client) ?? 0) + i.amount));
  prv.forEach(i => i.client && byClientPrv.set(i.client, (byClientPrv.get(i.client) ?? 0) + i.amount));
  let topClient: CliT | null = null;
  byClientCur.forEach((v, k) => {
    const d = deltaPct(v, byClientPrv.get(k) ?? 0);
    const cur2 = topClient;
    if (v > 0 && d > 30 && (!cur2 || d > cur2.delta)) topClient = { client: k, delta: d, curr: v };
  });
  const tcl: CliT | null = topClient;
  if (tcl) {
    out.push({
      id: `client-${tcl.client}`,
      severity: tcl.delta > 80 ? "critico" : "atencao",
      title: `Cliente em destaque: ${tcl.client}`,
      body: `Reembolsos vinculados a ${tcl.client} subiram ${fmtPct(tcl.delta)} (${fmtBRL(tcl.curr)}). Verificar contratualização.`,
    });
  }


  return out;
}

export type Notification = {
  id: string;
  severity: "info" | "atencao" | "critico";
  title: string;
  body: string;
  at: Date;
};

export function generateNotifications(all: Reimbursement[]): Notification[] {
  const now = new Date();
  const out: Notification[] = [];
  const oldPending = all.filter(i => i.status === "pendente" && (now.getTime() - i.date.getTime()) > 86400000);
  if (oldPending.length) {
    out.push({
      id: "pending-old",
      severity: oldPending.length > 10 ? "critico" : "atencao",
      title: `${oldPending.length} reembolso(s) pendente(s) há +24h`,
      body: `Total parado: ${fmtBRL(oldPending.reduce((s,i)=>s+i.amount,0))}.`,
      at: now,
    });
  }
  const weekAgo = addDays(now, -7);
  const recentRejected = all.filter(i => i.status === "rejeitado" && i.date >= weekAgo);
  if (recentRejected.length >= 3) {
    out.push({
      id: "rejected-week",
      severity: "atencao",
      title: `${recentRejected.length} rejeições na última semana`,
      body: `Valor: ${fmtBRL(recentRejected.reduce((s,i)=>s+i.amount,0))}. Considere revisar política.`,
      at: now,
    });
  }
  return out;
}

export function toCSV(items: Reimbursement[]): string {
  const cols = ["date","amount","department","employee","client","category","status","description"];
  const lines = [cols.join(",")];
  items.forEach(i => {
    lines.push(cols.map(c => {
      const v = (i as any)[c];
      const s = v instanceof Date ? v.toISOString().slice(0,10) : String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(","));
  });
  return lines.join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
