import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getSpreadsheetMeta, getSheetRows, type SheetMeta } from "@/lib/sheets.functions";
import { CANONICAL_FIELDS, type ComparisonMode, type Config, type DateRange, type FieldKey, type Filters, type Mapping, type Reimbursement, type ReimbStatus } from "@/features/reimb/types";
import { useConfig, useDarkMode } from "@/features/reimb/store";
import { normalize } from "@/features/reimb/normalize";
import {
  applyFilters, computeKpis, deltaPct, download, fmtBRL, fmtBRLDec, fmtPct,
  generateInsights, generateNotifications, getComparisonRanges, groupBy, groupByMonth,
  inRange, toCSV, uniqueValues, type Insight,
} from "@/features/reimb/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reembolsos | Painel executivo em tempo real" },
      { name: "description", content: "Painel de reembolsos conectado à sua planilha online, com insights, comparações e exportação." },
    ],
  }),
  component: App,
});

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

type TabKey = "reembolsos" | "exportar";
const navItems: { key: TabKey; icon: string; label: string }[] = [
  { key: "reembolsos", icon: "receipt_long", label: "Reembolsos" },
  { key: "exportar", icon: "settings_input_component", label: "Dados & Exportação" },
];

function App() {
  const [tab, setTab] = useState<TabKey>("reembolsos");
  const [dark, setDark] = useDarkMode();
  const [config, setConfig] = useConfig();

  const getRows = useServerFn(getSheetRows);
  const sheetQuery = useQuery({
    queryKey: ["sheet-rows", config.spreadsheetId, config.sheet],
    enabled: !!(config.spreadsheetId && config.sheet && config.mapping?.date && config.mapping?.amount),
    refetchInterval: 5 * 60 * 1000,
    queryFn: () => getRows({ data: { spreadsheetId: config.spreadsheetId!, sheet: config.sheet! } }),
  });

  const items: Reimbursement[] = useMemo(() => {
    if (!sheetQuery.data || !config.mapping) return [];
    return normalize(sheetQuery.data.headers, sheetQuery.data.rows, config.mapping);
  }, [sheetQuery.data, config.mapping]);

  return (
    <div className="min-h-screen bg-ep-surface text-ep-on-surface">
      <Sidebar tab={tab} setTab={setTab} dark={dark} setDark={setDark} />
      <Topbar
        items={items}
        lastFetch={sheetQuery.data?.fetchedAt}
        refetching={sheetQuery.isFetching}
        onRefresh={() => sheetQuery.refetch()}
        dark={dark}
        setDark={setDark}
      />
      <main className="ml-64 pt-16 p-6">
        {tab === "reembolsos" ? (
          <ReembolsosView items={items} loading={sheetQuery.isLoading} connected={!!config.spreadsheetId} error={sheetQuery.error as Error | null} goConnect={() => setTab("exportar")} />
        ) : (
          <ExportView items={items} config={config} setConfig={setConfig} />
        )}
      </main>
    </div>
  );
}

/* ---------------- Sidebar / Topbar ---------------- */

function Sidebar({ tab, setTab, dark, setDark }: { tab: TabKey; setTab: (t: TabKey) => void; dark: boolean; setDark: (v: boolean) => void }) {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-ep-outline-variant bg-ep-surface-lowest">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-ep-outline-variant">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ep-primary text-ep-on-primary">
          <Icon name="receipt_long" />
        </span>
        <div>
          <div className="text-sm font-semibold leading-tight">Reembolsos</div>
          <div className="text-xs text-ep-on-surface-variant">Painel executivo</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(n => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${tab === n.key ? "bg-ep-primary text-ep-on-primary" : "text-ep-on-surface-variant hover:bg-ep-surface-low"}`}
          >
            <Icon name={n.icon} className="text-[20px]" />
            {n.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-ep-outline-variant">
        <button
          onClick={() => setDark(!dark)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ep-on-surface-variant hover:bg-ep-surface-low"
        >
          <Icon name={dark ? "light_mode" : "dark_mode"} className="text-[20px]" />
          {dark ? "Modo claro" : "Modo escuro"}
        </button>
      </div>
    </aside>
  );
}

function Topbar({ items, lastFetch, refetching, onRefresh, dark, setDark }: {
  items: Reimbursement[]; lastFetch?: string; refetching: boolean; onRefresh: () => void;
  dark: boolean; setDark: (v: boolean) => void;
}) {
  const [openNotif, setOpenNotif] = useState(false);
  const notifications = useMemo(() => generateNotifications(items), [items]);
  const last = lastFetch ? new Date(lastFetch) : null;
  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-ep-outline-variant bg-ep-surface-lowest/95 backdrop-blur px-6 no-print">
      <div className="flex items-center gap-3 text-sm text-ep-on-surface-variant">
        <Icon name="sync" className={refetching ? "animate-spin text-ep-primary" : "text-ep-on-surface-variant"} />
        <span>
          {last ? `Última atualização: ${last.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Sem dados conectados"}
        </span>
        <button onClick={onRefresh} className="rounded-md border border-ep-outline-variant px-2 py-1 text-xs hover:bg-ep-surface-low">
          Atualizar agora
        </button>
        <span className="hidden md:inline text-xs">Auto-refresh a cada 5 min</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setDark(!dark)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ep-surface-low" aria-label="Trocar tema">
          <Icon name={dark ? "light_mode" : "dark_mode"} />
        </button>
        <div className="relative">
          <button onClick={() => setOpenNotif(o => !o)} className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-ep-surface-low" aria-label="Notificações">
            <Icon name="notifications" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ep-error px-1 text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {openNotif && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-ep-outline-variant bg-ep-surface-lowest shadow-lg">
              <div className="border-b border-ep-outline-variant px-4 py-3 text-sm font-semibold">Notificações</div>
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-ep-on-surface-variant">Nenhuma notificação no momento.</div>
              ) : (
                <ul className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <li key={n.id} className="border-b border-ep-outline-variant px-4 py-3 last:border-b-0">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${n.severity === "critico" ? "bg-ep-error" : n.severity === "atencao" ? "bg-ep-tertiary" : "bg-ep-primary"}`} />
                        <div>
                          <div className="text-sm font-medium">{n.title}</div>
                          <div className="text-xs text-ep-on-surface-variant">{n.body}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------------- Reembolsos view ---------------- */

function ReembolsosView({ items, loading, connected, error, goConnect }: {
  items: Reimbursement[]; loading: boolean; connected: boolean; error: Error | null; goConnect: () => void;
}) {
  const [comparison, setComparison] = useState<ComparisonMode>("mom");
  const [customRange, setCustomRange] = useState<{ current: DateRange; previous: DateRange } | undefined>();
  const [filters, setFilters] = useState<Filters>({});
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const ranges = useMemo(() => getComparisonRanges(comparison, customRange), [comparison, customRange]);
  const filtered = useMemo(() => applyFilters(items, { ...filters, range: filters.range ?? ranges.current }), [items, filters, ranges]);
  const prevFiltered = useMemo(() => applyFilters(items, { ...filters, range: ranges.previous }), [items, filters, ranges]);

  const kpisCur = useMemo(() => computeKpis(filtered), [filtered]);
  const kpisPrev = useMemo(() => computeKpis(prevFiltered), [prevFiltered]);
  const insights = useMemo(() => generateInsights(items, ranges.current, ranges.previous, ranges.label), [items, ranges]);
  const monthly = useMemo(() => groupByMonth(filtered).slice(-6), [filtered]);
  const byDept = useMemo(() => groupBy(filtered, "department"), [filtered]);
  const byCat = useMemo(() => groupBy(filtered, "category"), [filtered]);

  if (!connected) {
    return (
      <EmptyState
        icon="link"
        title="Conecte sua planilha de reembolsos"
        body="Vá em Dados & Exportação, cole o link da planilha Google Sheets e mapeie as colunas para começar."
        cta={{ label: "Configurar agora", onClick: goConnect }}
      />
    );
  }
  if (loading) return <div className="grid place-items-center py-24 text-ep-on-surface-variant"><Icon name="hourglass" className="animate-spin" /> Carregando dados...</div>;
  if (error) return <EmptyState icon="error" title="Erro ao ler planilha" body={error.message} />;
  if (!items.length) return <EmptyState icon="inbox" title="Sem registros" body="A planilha está conectada, mas nenhuma linha pôde ser interpretada. Revise o mapeamento das colunas." />;

  return (
    <div className="space-y-6">
      <FiltersBar
        items={items}
        filters={filters}
        setFilters={setFilters}
        comparison={comparison}
        setComparison={setComparison}
        customRange={customRange}
        setCustomRange={setCustomRange}
        rangeLabel={ranges.label}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="payments" label="Total Reembolsado" value={fmtBRL(kpisCur.total)} delta={deltaPct(kpisCur.total, kpisPrev.total)} note={ranges.label} />
        <KpiCard icon="receipt" label="Solicitações" value={kpisCur.count.toLocaleString("pt-BR")} delta={deltaPct(kpisCur.count, kpisPrev.count)} note={`${kpisCur.pending} pendentes`} />
        <KpiCard icon="task_alt" label="Taxa de Aprovação" value={`${kpisCur.approvalRate.toFixed(1)}%`} delta={kpisCur.approvalRate - kpisPrev.approvalRate} unit="pp" note={`${kpisCur.approved} aprovados`} />
        <KpiCard icon="payments" label="Ticket Médio" value={fmtBRLDec(kpisCur.avgAmount)} delta={deltaPct(kpisCur.avgAmount, kpisPrev.avgAmount)} note="Por solicitação" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Evolução mensal" subtitle="Aprovados vs. rejeitados" />
          <MonthlyChart data={monthly} />
        </Card>
        <Card>
          <CardTitle title="Insights Executivos" subtitle={ranges.label} />
          <InsightsList items={insights} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Ranking de Departamentos" subtitle="Clique para detalhar" />
          <DeptRanking data={byDept} onSelect={setSelectedDept} />
        </Card>
        <Card>
          <CardTitle title="Por Categoria/Benefício" subtitle="Distribuição do período" />
          <CategoryList data={byCat.slice(0, 6)} total={kpisCur.total} />
        </Card>
      </div>

      <Card>
        <CardTitle title="Transações Recentes" subtitle={`${filtered.length} resultados`} />
        <TransactionsTable items={filtered.slice().sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, 50)} />
      </Card>

      {selectedDept && (
        <DepartmentModal
          dept={selectedDept}
          items={items.filter(i => i.department === selectedDept && inRange(i.date, ranges.current))}
          onClose={() => setSelectedDept(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Building blocks ---------------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-5 ${className}`}>{children}</section>;
}
function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-ep-on-surface-variant">{subtitle}</p>}
    </div>
  );
}

function KpiCard({ icon, label, value, delta, note, unit }: { icon: string; label: string; value: string; delta: number; note: string; unit?: string }) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-ep-primary/10 text-ep-primary"><Icon name={icon} /></span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${up ? "bg-ep-success/10 text-ep-success" : "bg-ep-error/10 text-ep-error"}`}>
          <Icon name={up ? "trending_up" : "trending_down"} className="text-sm" />
          {unit === "pp" ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp` : fmtPct(delta)}
        </span>
      </div>
      <div className="mt-4 text-xs uppercase tracking-wide text-ep-on-surface-variant">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-ep-on-surface-variant">{note}</div>
    </div>
  );
}

function FiltersBar({ items, filters, setFilters, comparison, setComparison, customRange, setCustomRange, rangeLabel }: {
  items: Reimbursement[]; filters: Filters; setFilters: (f: Filters) => void;
  comparison: ComparisonMode; setComparison: (c: ComparisonMode) => void;
  customRange?: { current: DateRange; previous: DateRange };
  setCustomRange: (r?: { current: DateRange; previous: DateRange }) => void;
  rangeLabel: string;
}) {
  const departments = uniqueValues(items, "department");
  const categories = uniqueValues(items, "category");
  const clients = uniqueValues(items, "client");
  return (
    <div className="rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-ep-on-surface-variant">Comparação:</span>
        {([
          ["wow", "Semana"], ["mom", "Mês"], ["yoy", "Ano (mesmo mês)"], ["30d", "30 dias"], ["90d", "90 dias"], ["custom", "Personalizado"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setComparison(k)} className={`rounded-full px-3 py-1 text-xs ${comparison === k ? "bg-ep-primary text-ep-on-primary" : "border border-ep-outline-variant text-ep-on-surface-variant hover:bg-ep-surface-low"}`}>
            {l}
          </button>
        ))}
        <span className="ml-2 text-xs text-ep-on-surface-variant">{rangeLabel}</span>
      </div>
      {comparison === "custom" && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(["current.from","current.to","previous.from","previous.to"] as const).map((path) => {
            const [g, p] = path.split(".") as ["current"|"previous", "from"|"to"];
            const val = (customRange?.[g]?.[p] ?? null);
            return (
              <label key={path} className="flex flex-col gap-1 text-xs text-ep-on-surface-variant">
                {g === "current" ? "Atual" : "Anterior"} — {p === "from" ? "início" : "fim"}
                <input type="date" value={val ? val.toISOString().slice(0,10) : ""}
                  onChange={e => {
                    const d = e.target.value ? new Date(e.target.value) : null;
                    const today = new Date();
                    const base = customRange ?? { current: { from: today, to: today }, previous: { from: today, to: today } };
                    const next = { ...base, [g]: { ...base[g], [p]: d ?? today } };
                    setCustomRange(next);
                  }}
                  className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1 text-sm" />
              </label>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <select value={filters.department ?? ""} onChange={e => setFilters({ ...filters, department: e.target.value || undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm">
          <option value="">Todos departamentos</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.category ?? ""} onChange={e => setFilters({ ...filters, category: e.target.value || undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm">
          <option value="">Todas categorias</option>
          {categories.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.client ?? ""} onChange={e => setFilters({ ...filters, client: e.target.value || undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm">
          <option value="">Todos clientes</option>
          {clients.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.status ?? ""} onChange={e => setFilters({ ...filters, status: (e.target.value || undefined) as ReimbStatus | undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm">
          <option value="">Todos status</option>
          <option value="aprovado">Aprovado</option>
          <option value="pendente">Pendente</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
        <input type="search" placeholder="Buscar..." value={filters.search ?? ""} onChange={e => setFilters({ ...filters, search: e.target.value || undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm" />
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: { label: string; approved: number; rejected: number; total: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.total));
  if (!data.length) return <div className="py-8 text-center text-sm text-ep-on-surface-variant">Sem dados no período.</div>;
  return (
    <div className="flex h-64 items-end gap-6 px-2">
      {data.map(d => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-56 w-full items-end justify-center gap-1">
            <div title={`Aprovado ${fmtBRL(d.approved)}`} className="w-3 rounded-t bg-ep-primary" style={{ height: `${(d.approved/max)*100}%` }} />
            <div title={`Rejeitado ${fmtBRL(d.rejected)}`} className="w-3 rounded-t bg-ep-error" style={{ height: `${(d.rejected/max)*100}%` }} />
            <div title={`Total ${fmtBRL(d.total)}`} className="w-3 rounded-t bg-ep-secondary" style={{ height: `${(d.total/max)*100}%` }} />
          </div>
          <span className="text-xs text-ep-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function InsightsList({ items }: { items: Insight[] }) {
  if (!items.length) return <div className="text-sm text-ep-on-surface-variant">Sem sinais relevantes no período.</div>;
  const tone = (s: Insight["severity"]) => s === "critico" ? "border-ep-error text-ep-error" : s === "atencao" ? "border-ep-tertiary text-ep-tertiary" : s === "positivo" ? "border-ep-success text-ep-success" : "border-ep-primary text-ep-primary";
  return (
    <ul className="space-y-3">
      {items.map(i => (
        <li key={i.id} className={`rounded-lg border-l-4 bg-ep-surface-low p-3 ${tone(i.severity)}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ep-on-surface">{i.title}</span>
            <span className="text-[10px] uppercase">{i.severity}</span>
          </div>
          <p className="mt-1 text-xs text-ep-on-surface-variant">{i.body}</p>
        </li>
      ))}
    </ul>
  );
}

function DeptRanking({ data, onSelect }: { data: { label: string; total: number; count: number }[]; onSelect: (d: string) => void }) {
  const max = Math.max(1, ...data.map(d => d.total));
  if (!data.length) return <div className="text-sm text-ep-on-surface-variant">Sem dados.</div>;
  return (
    <ul className="space-y-2">
      {data.slice(0, 6).map(d => (
        <li key={d.label}>
          <button onClick={() => onSelect(d.label)} className="w-full rounded-lg p-3 text-left transition hover:bg-ep-surface-low">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{d.label}</span>
              <span className="text-ep-on-surface-variant">{fmtBRL(d.total)} · {d.count}</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-ep-surface-highest">
              <div className="h-full rounded-full bg-ep-primary" style={{ width: `${(d.total/max)*100}%` }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CategoryList({ data, total }: { data: { label: string; total: number; count: number }[]; total: number }) {
  if (!data.length) return <div className="text-sm text-ep-on-surface-variant">Sem dados.</div>;
  const colors = ["bg-ep-primary", "bg-ep-tertiary", "bg-ep-secondary", "bg-ep-success", "bg-ep-error", "bg-ep-surface-highest"];
  return (
    <ul className="space-y-3">
      {data.map((d, i) => {
        const pct = total ? (d.total / total) * 100 : 0;
        return (
          <li key={d.label}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
                <span>{d.label}</span>
              </div>
              <span className="text-ep-on-surface-variant">{fmtBRL(d.total)} · {pct.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-ep-surface-highest">
              <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TransactionsTable({ items }: { items: Reimbursement[] }) {
  if (!items.length) return <div className="py-6 text-center text-sm text-ep-on-surface-variant">Nenhuma transação.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ep-outline-variant text-left text-xs uppercase text-ep-on-surface-variant">
            <th className="py-2 pr-3">Data</th>
            <th className="py-2 pr-3">Colaborador</th>
            <th className="py-2 pr-3">Depto.</th>
            <th className="py-2 pr-3">Categoria</th>
            <th className="py-2 pr-3">Cliente</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pl-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className="border-b border-ep-outline-variant/40 last:border-b-0">
              <td className="py-2 pr-3 text-ep-on-surface-variant">{i.date.toLocaleDateString("pt-BR")}</td>
              <td className="py-2 pr-3 font-medium">{i.employee}</td>
              <td className="py-2 pr-3">{i.department}</td>
              <td className="py-2 pr-3">{i.category}</td>
              <td className="py-2 pr-3">{i.client || "—"}</td>
              <td className="py-2 pr-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "aprovado" ? "bg-ep-success/10 text-ep-success" : i.status === "rejeitado" ? "bg-ep-error/10 text-ep-error" : "bg-ep-tertiary/10 text-ep-tertiary"}`}>{i.status}</span>
              </td>
              <td className="py-2 pl-3 text-right font-mono">{fmtBRLDec(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepartmentModal({ dept, items, onClose }: { dept: string; items: Reimbursement[]; onClose: () => void }) {
  const k = computeKpis(items);
  const monthly = groupByMonth(items).slice(-6);
  const byCat = groupBy(items, "category").slice(0, 5);
  const byEmployee = groupBy(items, "employee").slice(0, 5);
  const byClient = groupBy(items, "client").slice(0, 5);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-ep-surface-lowest p-6 custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{dept}</h2>
            <p className="text-xs text-ep-on-surface-variant">Visão detalhada do departamento no período</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ep-surface-low"><Icon name="close" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total" value={fmtBRL(k.total)} />
          <Stat label="Solicitações" value={String(k.count)} />
          <Stat label="Ticket médio" value={fmtBRLDec(k.avgAmount)} />
          <Stat label="Aprovação" value={`${k.approvalRate.toFixed(1)}%`} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card><CardTitle title="Evolução mensal" /><MonthlyChart data={monthly} /></Card>
          <Card><CardTitle title="Top categorias" /><CategoryList data={byCat} total={k.total} /></Card>
          <Card><CardTitle title="Top colaboradores" /><MiniRanking data={byEmployee} /></Card>
          <Card><CardTitle title="Top clientes" /><MiniRanking data={byClient} /></Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ep-outline-variant bg-ep-surface-low p-3">
      <div className="text-[11px] uppercase text-ep-on-surface-variant">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function MiniRanking({ data }: { data: { label: string; total: number; count: number }[] }) {
  if (!data.length) return <div className="text-sm text-ep-on-surface-variant">Sem dados.</div>;
  const max = Math.max(1, ...data.map(d => d.total));
  return (
    <ul className="space-y-2 text-sm">
      {data.map(d => (
        <li key={d.label}>
          <div className="flex justify-between"><span>{d.label || "—"}</span><span className="text-ep-on-surface-variant">{fmtBRL(d.total)}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-ep-surface-highest"><div className="h-full rounded-full bg-ep-primary" style={{ width: `${(d.total/max)*100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-ep-outline-variant bg-ep-surface-lowest p-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ep-surface-low text-ep-primary"><Icon name={icon} /></span>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ep-on-surface-variant">{body}</p>
      {cta && <button onClick={cta.onClick} className="mt-4 rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary">{cta.label}</button>}
    </div>
  );
}

/* ---------------- Export & connection view ---------------- */

function ExportView({ items, config, setConfig }: { items: Reimbursement[]; config: Config; setConfig: (c: Config) => void }) {
  const [url, setUrl] = useState(config.spreadsheetUrl ?? "");
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const getMeta = useServerFn(getSpreadsheetMeta);
  const [sheet, setSheet] = useState(config.sheet ?? "");
  const [mapping, setMapping] = useState<Mapping>(config.mapping ?? {});

  const connect = async () => {
    setLoading(true); setErr(null);
    try {
      const m = await getMeta({ data: { url } });
      setMeta(m);
      const firstSheet = m.sheets[0]?.title ?? "";
      setSheet(firstSheet);
      setConfig({ ...config, spreadsheetId: m.spreadsheetId, spreadsheetUrl: url, spreadsheetTitle: m.title, sheet: firstSheet });
      // Auto-guess mapping by header similarity
      const headers = m.sheets.find(s => s.title === firstSheet)?.headers ?? [];
      const guess: Mapping = { ...mapping };
      CANONICAL_FIELDS.forEach(f => {
        if (guess[f.key]) return;
        const match = headers.find(h => h.toLowerCase().includes(f.label.toLowerCase().split("/")[0].trim())
          || h.toLowerCase().includes(f.key));
        if (match) guess[f.key] = match;
      });
      setMapping(guess);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!meta && config.spreadsheetUrl) {
      // re-fetch meta on load to show available sheets
      setUrl(config.spreadsheetUrl);
      (async () => {
        try { const m = await getMeta({ data: { url: config.spreadsheetUrl! } }); setMeta(m); } catch {}
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheetHeaders = meta?.sheets.find(s => s.title === sheet)?.headers ?? [];
  const canSave = !!sheet && !!mapping.date && !!mapping.amount && !!mapping.department && !!mapping.category && !!mapping.status && !!mapping.employee;

  const save = () => setConfig({ ...config, sheet, mapping });

  const exportCSV = () => download(`reembolsos-${new Date().toISOString().slice(0,10)}.csv`, toCSV(items), "text/csv");
  const exportJSON = () => download(`reembolsos-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(items, null, 2), "application/json");

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle title="Conectar planilha online" subtitle="Cole o link de uma planilha Google Sheets. A leitura é feita via conexão segura da Lovable." />
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-3 py-2 text-sm"
          />
          <button onClick={connect} disabled={!url || loading} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">
            {loading ? "Lendo..." : meta ? "Reanalisar" : "Conectar"}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-ep-error">{err}</p>}
        {meta && (
          <div className="mt-3 text-xs text-ep-on-surface-variant">
            Conectado a <span className="font-semibold text-ep-on-surface">{meta.title}</span> — {meta.sheets.length} aba(s) detectada(s).
          </div>
        )}
      </Card>

      {meta && (
        <Card>
          <CardTitle title="Mapear colunas" subtitle="Diga ao sistema qual coluna da planilha representa cada campo." />
          <div className="mb-3 flex items-center gap-2 text-sm">
            <label className="text-ep-on-surface-variant">Aba:</label>
            <select value={sheet} onChange={e => setSheet(e.target.value)} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5">
              {meta.sheets.map(s => <option key={s.title} value={s.title}>{s.title} ({s.headers.length} colunas)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CANONICAL_FIELDS.map(f => (
              <div key={f.key} className="flex items-center justify-between gap-2 rounded-lg border border-ep-outline-variant bg-ep-surface-low p-3">
                <div>
                  <div className="text-sm font-medium">{f.label} {f.required && <span className="text-ep-error">*</span>}</div>
                  <div className="text-xs text-ep-on-surface-variant">campo do sistema: {f.key}</div>
                </div>
                <select
                  value={mapping[f.key] ?? ""}
                  onChange={e => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}
                  className="min-w-40 rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm"
                >
                  <option value="">— não mapeado —</option>
                  {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={save} disabled={!canSave} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">
              Salvar mapeamento
            </button>
          </div>
          {!canSave && <p className="mt-2 text-xs text-ep-error">Mapeie ao menos: Data, Valor, Departamento, Colaborador, Categoria e Status.</p>}
        </Card>
      )}

      <Card>
        <CardTitle title="Exportar dados" subtitle={`${items.length} registros disponíveis (após filtros aplicados na aba Reembolsos não se aplicam aqui — exporta tudo)`} />
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} disabled={!items.length} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">Baixar CSV</button>
          <button onClick={exportJSON} disabled={!items.length} className="rounded-md border border-ep-outline-variant px-4 py-2 text-sm disabled:opacity-50">Baixar JSON</button>
          <button onClick={() => window.print()} className="rounded-md border border-ep-outline-variant px-4 py-2 text-sm">Imprimir / PDF</button>
        </div>
      </Card>
    </div>
  );
}
