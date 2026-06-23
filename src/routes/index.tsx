import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getSheetConfigFn, saveSheetConfigFn, refreshReimbursementsFn, probeSheetFn, rowsToReimbursements, getReimbursementCacheFn, type RawReimbursementRow } from "@/lib/reimb.functions";
import {
  CANONICAL_FIELDS,
  type ComparisonMode, type Config, type DateRange, type Filters,
  type Mapping, type Reimbursement, type ReimbStatus, type SheetMeta,
} from "@/features/reimb/types";
import { useDarkMode, useIsMobile } from "@/features/reimb/store";
import {
  applyFilters, computeKpis, deltaPct, download, fmtBRL, fmtBRLDec, fmtPct,
  generateInsights, generateNotifications, getComparisonRanges, groupBy, groupByMonth,
  inRange, toCSV, uniqueValues, type Insight,
} from "@/features/reimb/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reembolsos | Painel Executivo" },
      { name: "description", content: "Painel de reembolsos conectado à planilha online (Google Sheets ou Excel)." },
    ],
  }),
  component: App,
});

const Icon = ({ name, className = "", style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

type TabKey = "reembolsos" | "exportar";

function App() {
  const [tab, setTab] = useState<TabKey>("reembolsos");
  const [dark, setDark, themeMounted] = useDarkMode();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  // Config from DB
  const getConfig = useServerFn(getSheetConfigFn);
  const cfgQuery = useQuery({ queryKey: ["sheet-config"], queryFn: () => getConfig() });
  const config: Config = cfgQuery.data ?? {};

  // Reimbursements from cache (read via secure server fn — table is locked down at the DB)
  const getCache = useServerFn(getReimbursementCacheFn);
  const itemsQuery = useQuery({
    queryKey: ["reimb-cache"],
    queryFn: async (): Promise<Reimbursement[]> => {
      const rows = await getCache();
      return rowsToReimbursements(rows as RawReimbursementRow[]);
    },
    refetchInterval: 60_000, // poll the cache every minute; cache itself refreshes every 5 min via sync route
    refetchOnWindowFocus: true,
  });

  // Trigger a refresh from any open client every 5 minutes
  const refresh = useServerFn(refreshReimbursementsFn);
  useEffect(() => {
    if (!config.spreadsheetId) return;
    const tick = async () => {
      try { await refresh(); qc.invalidateQueries({ queryKey: ["reimb-cache"] }); qc.invalidateQueries({ queryKey: ["sheet-config"] }); } catch {/* ignore */}
    };
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [config.spreadsheetId, refresh, qc]);

  const items = itemsQuery.data ?? [];
  const connected = !!config.spreadsheetId;

  return (
    <div className="min-h-screen bg-ep-surface text-ep-on-surface">
      {!isMobile && <DesktopSidebar tab={tab} setTab={setTab} dark={dark} setDark={setDark} themeMounted={themeMounted} />}
      {!isMobile && <DesktopTopbar items={items} lastSync={config.lastSyncAt} refetching={itemsQuery.isFetching} onRefresh={() => refresh().then(() => qc.invalidateQueries({ queryKey: ["reimb-cache"] }))} dark={dark} setDark={setDark} themeMounted={themeMounted} />}
      {isMobile && <MobileTopbar dark={dark} setDark={setDark} themeMounted={themeMounted} />}

      <main className={isMobile ? "px-4 pb-24 pt-20" : "ml-64 pt-16 p-6"}>
        {tab === "reembolsos" ? (
          <ReembolsosView items={items} loading={itemsQuery.isLoading} connected={connected} error={itemsQuery.error as Error | null} goConnect={() => setTab("exportar")} isMobile={isMobile} lastSyncError={config.lastSyncError} />
        ) : (
          <ExportView items={items} config={config} onSaved={() => { qc.invalidateQueries({ queryKey: ["sheet-config"] }); qc.invalidateQueries({ queryKey: ["reimb-cache"] }); }} />
        )}
      </main>

      {isMobile && <MobileBottomNav tab={tab} setTab={setTab} />}
    </div>
  );
}

/* ===================== DESKTOP CHROME ===================== */

function DesktopSidebar({ tab, setTab, dark, setDark, themeMounted }: { tab: TabKey; setTab: (t: TabKey) => void; dark: boolean; setDark: (v: boolean) => void; themeMounted: boolean }) {
  const items: { key: TabKey; icon: string; label: string }[] = [
    { key: "reembolsos", icon: "receipt_long", label: "Reembolsos" },
    { key: "exportar", icon: "settings_input_component", label: "Dados & Exportação" },
  ];
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
        {items.map(n => (
          <button key={n.key} onClick={() => setTab(n.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${tab === n.key ? "bg-ep-primary text-ep-on-primary" : "text-ep-on-surface-variant hover:bg-ep-surface-low"}`}>
            <Icon name={n.icon} className="text-[20px]" />
            {n.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-ep-outline-variant">
        <button onClick={() => setDark(!dark)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ep-on-surface-variant hover:bg-ep-surface-low">
          <Icon name="dark_mode" className="text-[20px]" />
          <span suppressHydrationWarning>{themeMounted ? (dark ? "Modo claro" : "Modo escuro") : "Tema"}</span>
        </button>
      </div>
    </aside>
  );
}

function DesktopTopbar({ items, lastSync, refetching, onRefresh, dark, setDark, themeMounted }: {
  items: Reimbursement[]; lastSync?: string; refetching: boolean; onRefresh: () => void;
  dark: boolean; setDark: (v: boolean) => void; themeMounted: boolean;
}) {
  const [openNotif, setOpenNotif] = useState(false);
  const notifications = useMemo(() => generateNotifications(items), [items]);
  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-ep-outline-variant bg-ep-surface-lowest/95 backdrop-blur px-6 no-print">
      <div className="flex items-center gap-3 text-sm text-ep-on-surface-variant">
        <Icon name="sync" className={refetching ? "animate-spin text-ep-primary" : ""} />
        <span suppressHydrationWarning>
          {lastSync ? `Última sincronização: ${new Date(lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Aguardando sincronização..."}
        </span>
        <button onClick={onRefresh} className="rounded-md border border-ep-outline-variant px-2 py-1 text-xs hover:bg-ep-surface-low">Atualizar agora</button>
        <span className="hidden lg:inline text-xs">Auto-sync a cada 5 min</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setDark(!dark)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ep-surface-low" aria-label="Trocar tema">
          <Icon name="dark_mode" />
          {themeMounted && <span className="sr-only">{dark ? "Modo claro" : "Modo escuro"}</span>}
        </button>
        <div className="relative">
          <button onClick={() => setOpenNotif(o => !o)} className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-ep-surface-low">
            <Icon name="notifications" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ep-error px-1 text-[10px] font-bold text-white">{notifications.length}</span>
            )}
          </button>
          {openNotif && <NotificationsDropdown notifications={notifications} onClose={() => setOpenNotif(false)} />}
        </div>
      </div>
    </header>
  );
}

function NotificationsDropdown({ notifications, onClose }: { notifications: ReturnType<typeof generateNotifications>; onClose: () => void }) {
  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg border border-ep-outline-variant bg-ep-surface-lowest shadow-lg z-50">
      <div className="flex items-center justify-between border-b border-ep-outline-variant px-4 py-3 text-sm font-semibold">
        Notificações
        <button onClick={onClose} className="text-ep-on-surface-variant"><Icon name="close" className="text-[18px]" /></button>
      </div>
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
  );
}

/* ===================== MOBILE CHROME ===================== */

function MobileTopbar({ dark, setDark, themeMounted }: { dark: boolean; setDark: (v: boolean) => void; themeMounted: boolean }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-ep-surface-lowest/85 backdrop-blur-2xl border-b border-ep-outline-variant px-4 py-3 flex justify-between items-center h-16">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-ep-primary/20 border border-ep-primary/30 rounded-xl flex items-center justify-center">
          <Icon name="receipt_long" className="text-ep-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }} />
        </div>
        <h1 className="text-base font-semibold tracking-tight">Reembolsos</h1>
      </div>
      <button onClick={() => setDark(!dark)} className="w-10 h-10 flex items-center justify-center text-ep-on-surface-variant" aria-label="Trocar tema">
        <Icon name="dark_mode" />
        {themeMounted && <span className="sr-only">{dark ? "claro" : "escuro"}</span>}
      </button>
    </header>
  );
}

function MobileBottomNav({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  const items: { key: TabKey; icon: string; label: string }[] = [
    { key: "reembolsos", icon: "receipt_long", label: "Reembolsos" },
    { key: "exportar", icon: "settings_input_component", label: "Dados" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-ep-surface-lowest/85 backdrop-blur-2xl border-t border-ep-outline-variant flex justify-around items-center h-20 pb-safe px-4">
      {items.map(n => {
        const active = tab === n.key;
        return (
          <button key={n.key} onClick={() => setTab(n.key)} className="flex flex-col items-center justify-center group">
            <div className={`flex items-center justify-center rounded-full px-6 py-2 transition-all duration-300 active:scale-90 ${active ? "bg-ep-primary/20 text-ep-primary border border-ep-primary/30" : "text-ep-on-surface-variant"}`}>
              <Icon name={n.icon} className="text-[26px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${active ? "text-ep-primary" : "text-ep-on-surface-variant"}`}>{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ===================== REEMBOLSOS VIEW ===================== */

function ReembolsosView({ items, loading, connected, error, goConnect, isMobile, lastSyncError }: {
  items: Reimbursement[]; loading: boolean; connected: boolean; error: Error | null; goConnect: () => void; isMobile: boolean; lastSyncError?: string | null;
}) {
  const [comparison, setComparison] = useState<ComparisonMode>("mom");
  const [customRange, setCustomRange] = useState<{ current: DateRange; previous: DateRange } | undefined>();
  const [filters, setFilters] = useState<Filters>({});
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const ranges = useMemo(() => getComparisonRanges(comparison, customRange), [comparison, customRange]);
  const filtered = useMemo(() => applyFilters(items, { ...filters, range: filters.range ?? ranges.current }), [items, filters, ranges]);
  const prevFiltered = useMemo(() => applyFilters(items, { ...filters, range: ranges.previous }), [items, filters, ranges]);
  const kpisCur = useMemo(() => computeKpis(filtered), [filtered]);
  const kpisPrev = useMemo(() => computeKpis(prevFiltered), [prevFiltered]);
  const insights = useMemo(() => generateInsights(items, ranges.current, ranges.previous, ranges.label), [items, ranges]);
  const monthly = useMemo(() => groupByMonth(filtered).slice(-6), [filtered]);
  const byDept = useMemo(() => groupBy(filtered, "department"), [filtered]);
  const byCat = useMemo(() => groupBy(filtered, "category"), [filtered]);
  const recent = useMemo(() => filtered.slice().sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, isMobile ? 8 : 50), [filtered, isMobile]);

  if (!connected) {
    return <EmptyState icon="link" title="Conecte sua planilha de reembolsos" body="Vá em Dados & Exportação, cole o link do Google Sheets ou Excel Online e mapeie as colunas." cta={{ label: "Configurar agora", onClick: goConnect }} />;
  }
  if (loading && !items.length) return <div className="grid place-items-center py-24 text-ep-on-surface-variant"><Icon name="hourglass" className="animate-spin" /> Carregando dados...</div>;
  if (error) return <EmptyState icon="error" title="Erro ao ler cache" body={error.message} />;
  if (!items.length) return <EmptyState icon="inbox" title="Sem registros" body={lastSyncError ? `Última sincronização falhou: ${lastSyncError}` : "Aguardando a primeira sincronização. Tente 'Atualizar agora' ou revise o mapeamento das colunas."} />;

  return (
    <div className="space-y-4 md:space-y-6">
      <FiltersBar items={items} filters={filters} setFilters={setFilters} comparison={comparison} setComparison={setComparison} customRange={customRange} setCustomRange={setCustomRange} rangeLabel={ranges.label} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard icon="payments" label="Total Reembolsado" value={fmtBRL(kpisCur.total)} delta={deltaPct(kpisCur.total, kpisPrev.total)} note={ranges.label} invert />
        <KpiCard icon="hourglass_bottom" label="Pendentes" value={fmtBRL(kpisCur.totalPending)} delta={deltaPct(kpisCur.totalPending, kpisPrev.totalPending)} note={`${kpisCur.pendente} solicitações`} invert />
        <KpiCard icon="task_alt" label="Taxa de Pagamento" value={`${kpisCur.paymentRate.toFixed(1)}%`} delta={kpisCur.paymentRate - kpisPrev.paymentRate} unit="pp" note={`${kpisCur.realizado} realizados`} />
        <KpiCard icon="receipt" label="Ticket Médio" value={fmtBRLDec(kpisCur.avgAmount)} delta={deltaPct(kpisCur.avgAmount, kpisPrev.avgAmount)} note={`${kpisCur.count} solicitações`} invert />
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Evolução mensal" subtitle="Realizados vs. pendentes" />
          <MonthlyChart data={monthly} />
        </Card>
        <Card>
          <CardTitle title="Insights Executivos" subtitle={ranges.label} />
          <InsightsList items={insights} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
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
        <CardTitle title="Últimas Solicitações" subtitle={`${filtered.length} resultados · clique no colaborador para ver histórico`} />
        <TransactionsTable items={recent} onSelectEmployee={setSelectedEmployee} />
      </Card>

      {selectedDept && (
        <DepartmentModal dept={selectedDept} items={items.filter(i => i.department === selectedDept && inRange(i.date, ranges.current))} onClose={() => setSelectedDept(null)} onSelectEmployee={(e) => { setSelectedDept(null); setSelectedEmployee(e); }} />
      )}
      {selectedEmployee && (
        <EmployeeModal employee={selectedEmployee} items={items.filter(i => i.employee === selectedEmployee)} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  );
}

/* ===================== Building blocks ===================== */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-4 md:p-5 ${className}`}>{children}</section>;
}
function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 md:mb-4">
      <h3 className="text-sm md:text-base font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-ep-on-surface-variant">{subtitle}</p>}
    </div>
  );
}

function KpiCard({ icon, label, value, delta, note, unit, invert }: { icon: string; label: string; value: string; delta: number; note: string; unit?: string; invert?: boolean }) {
  const positiveDir = invert ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-lg bg-ep-primary/10 text-ep-primary"><Icon name={icon} /></span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] md:text-xs ${positiveDir ? "bg-ep-success/10 text-ep-success" : "bg-ep-error/10 text-ep-error"}`}>
          <Icon name={delta >= 0 ? "trending_up" : "trending_down"} className="text-sm" />
          {unit === "pp" ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp` : fmtPct(delta)}
        </span>
      </div>
      <div className="mt-3 md:mt-4 text-[10px] md:text-xs uppercase tracking-wide text-ep-on-surface-variant">{label}</div>
      <div className="mt-1 text-lg md:text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[10px] md:text-xs text-ep-on-surface-variant">{note}</div>
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
    <div className="rounded-2xl border border-ep-outline-variant bg-ep-surface-lowest p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] md:text-xs font-semibold uppercase text-ep-on-surface-variant">Comparação:</span>
        {([
          ["wow", "Semana"], ["mom", "Mês"], ["yoy", "Ano (mesmo mês)"], ["30d", "30d"], ["90d", "90d"], ["custom", "Personalizado"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setComparison(k)} className={`rounded-full px-3 py-1 text-xs ${comparison === k ? "bg-ep-primary text-ep-on-primary" : "border border-ep-outline-variant text-ep-on-surface-variant hover:bg-ep-surface-low"}`}>{l}</button>
        ))}
        <span className="ml-1 text-[10px] md:text-xs text-ep-on-surface-variant">{rangeLabel}</span>
      </div>
      {comparison === "custom" && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(["current.from","current.to","previous.from","previous.to"] as const).map((path) => {
            const [g, p] = path.split(".") as ["current"|"previous", "from"|"to"];
            const val = customRange?.[g]?.[p] ?? null;
            return (
              <label key={path} className="flex flex-col gap-1 text-[10px] md:text-xs text-ep-on-surface-variant">
                {g === "current" ? "Atual" : "Anterior"} — {p === "from" ? "início" : "fim"}
                <input type="date" value={val ? val.toISOString().slice(0,10) : ""} onChange={e => {
                  const d = e.target.value ? new Date(e.target.value) : null;
                  const today = new Date();
                  const base = customRange ?? { current: { from: today, to: today }, previous: { from: today, to: today } };
                  setCustomRange({ ...base, [g]: { ...base[g], [p]: d ?? today } });
                }} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1 text-sm" />
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
          <option value="pendente">Pendente</option>
          <option value="realizado">Realizado</option>
        </select>
        <input type="search" placeholder="Buscar..." value={filters.search ?? ""} onChange={e => setFilters({ ...filters, search: e.target.value || undefined })} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm" />
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: { label: string; realizado: number; pendente: number; total: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.total));
  if (!data.length) return <div className="py-8 text-center text-sm text-ep-on-surface-variant">Sem dados no período.</div>;
  return (
    <div className="flex h-80 md:h-96 items-end gap-3 md:gap-6 px-2">
      {data.map(d => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-72 md:h-88 w-full items-end justify-center gap-1.5" style={{ height: "calc(100% - 1.5rem)" }}>
            <div title={`Realizado ${fmtBRL(d.realizado)}`} className="w-3 md:w-4 rounded-t bg-ep-success" style={{ height: `${(d.realizado/max)*100}%` }} />
            <div title={`Pendente ${fmtBRL(d.pendente)}`} className="w-3 md:w-4 rounded-t bg-ep-tertiary" style={{ height: `${(d.pendente/max)*100}%` }} />
            <div title={`Total ${fmtBRL(d.total)}`} className="w-3 md:w-4 rounded-t bg-ep-primary" style={{ height: `${(d.total/max)*100}%` }} />
          </div>
          <span className="text-[10px] md:text-xs text-ep-on-surface-variant">{d.label}</span>
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
          <div className="flex items-center justify-between gap-2">
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
          <button onClick={() => onSelect(d.label)} className="w-full rounded-lg p-2 md:p-3 text-left transition hover:bg-ep-surface-low">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{d.label}</span>
              <span className="text-ep-on-surface-variant text-xs">{fmtBRL(d.total)} · {d.count}</span>
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
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} /><span>{d.label}</span></div>
              <span className="text-ep-on-surface-variant text-xs">{fmtBRL(d.total)} · {pct.toFixed(1)}%</span>
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

function StatusBadge({ status }: { status: ReimbStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status === "realizado" ? "bg-ep-success/15 text-ep-success border border-ep-success/30" : "bg-ep-tertiary/15 text-ep-tertiary border border-ep-tertiary/30"}`}>{status}</span>
  );
}

function TransactionsTable({ items, onSelectEmployee }: { items: Reimbursement[]; onSelectEmployee: (e: string) => void }) {
  if (!items.length) return <div className="py-6 text-center text-sm text-ep-on-surface-variant">Nenhuma transação.</div>;

  // Mobile card list
  return (
    <>
      <div className="md:hidden space-y-2">
        {items.map(i => (
          <button key={i.id} onClick={() => onSelectEmployee(i.employee)} className="w-full flex items-center justify-between p-3 rounded-xl border border-ep-outline-variant bg-ep-surface-low active:scale-[0.99] transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-ep-primary/15 border border-ep-primary/20 flex items-center justify-center text-ep-primary shrink-0"><Icon name="person" className="text-[22px]" /></div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="font-semibold text-sm truncate">{i.employee}</span>
                <span className="text-[11px] text-ep-on-surface-variant">{i.date.toLocaleDateString("pt-BR")} · {i.category}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
              <span className="font-bold text-sm">{fmtBRLDec(i.amount)}</span>
              <StatusBadge status={i.status} />
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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
              <tr key={i.id} className="border-b border-ep-outline-variant/40 last:border-b-0 hover:bg-ep-surface-low cursor-pointer" onClick={() => onSelectEmployee(i.employee)}>
                <td className="py-2 pr-3 text-ep-on-surface-variant">{i.date.toLocaleDateString("pt-BR")}</td>
                <td className="py-2 pr-3 font-medium text-ep-primary hover:underline">{i.employee}</td>
                <td className="py-2 pr-3">{i.department}</td>
                <td className="py-2 pr-3">{i.category}</td>
                <td className="py-2 pr-3">{i.client || "—"}</td>
                <td className="py-2 pr-3"><StatusBadge status={i.status} /></td>
                <td className="py-2 pl-3 text-right font-mono">{fmtBRLDec(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DepartmentModal({ dept, items, onClose, onSelectEmployee }: { dept: string; items: Reimbursement[]; onClose: () => void; onSelectEmployee: (e: string) => void }) {
  const k = computeKpis(items);
  const monthly = groupByMonth(items).slice(-6);
  const byCat = groupBy(items, "category").slice(0, 5);
  const byEmployee = groupBy(items, "employee").slice(0, 5);
  return (
    <Modal onClose={onClose} title={dept} subtitle="Visão detalhada do departamento no período">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total" value={fmtBRL(k.total)} />
        <Stat label="Solicitações" value={String(k.count)} />
        <Stat label="Pagas" value={fmtBRL(k.totalPaid)} />
        <Stat label="Taxa de pagamento" value={`${k.paymentRate.toFixed(0)}%`} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card><CardTitle title="Evolução mensal" /><MonthlyChart data={monthly} /></Card>
        <Card><CardTitle title="Top categorias" /><CategoryList data={byCat} total={k.total} /></Card>
        <Card className="md:col-span-2">
          <CardTitle title="Top colaboradores (clique para ver histórico)" />
          <ul className="space-y-2">
            {byEmployee.map(e => (
              <li key={e.label}>
                <button onClick={() => onSelectEmployee(e.label)} className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-ep-surface-low">
                  <span className="text-sm font-medium text-ep-primary">{e.label || "—"}</span>
                  <span className="text-xs text-ep-on-surface-variant">{fmtBRL(e.total)} · {e.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Modal>
  );
}

function EmployeeModal({ employee, items, onClose }: { employee: string; items: Reimbursement[]; onClose: () => void }) {
  const sorted = items.slice().sort((a,b) => b.date.getTime() - a.date.getTime());
  const k = computeKpis(items);
  const dept = items[0]?.department ?? "—";
  const monthly = groupByMonth(items).slice(-6);
  const lastStatus = sorted[0]?.status;

  return (
    <Modal onClose={onClose} title={employee} subtitle={`${dept} · ${items.length} registro(s) no total`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total reembolsado" value={fmtBRL(k.total)} />
        <Stat label="Realizados" value={fmtBRL(k.totalPaid)} />
        <Stat label="Pendentes" value={fmtBRL(k.totalPending)} />
        <Stat label="Status atual" value={lastStatus ? lastStatus[0].toUpperCase() + lastStatus.slice(1) : "—"} />
      </div>

      <div className="mt-4">
        <Card>
          <CardTitle title="Tendência mensal" />
          <MonthlyChart data={monthly} />
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardTitle title="Histórico completo" subtitle="Inclui observações da planilha" />
          <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
            {sorted.map(i => (
              <div key={i.id} className="rounded-lg border border-ep-outline-variant bg-ep-surface-low p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{i.date.toLocaleDateString("pt-BR")} · {i.category}</span>
                    <span className="text-xs text-ep-on-surface-variant">{i.department}{i.client ? ` · ${i.client}` : ""}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold">{fmtBRLDec(i.amount)}</span>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
                {(i.description || i.observacao) && (
                  <div className="mt-2 pt-2 border-t border-ep-outline-variant/60 text-xs space-y-1">
                    {i.description && <p><span className="font-semibold text-ep-on-surface-variant">Descrição:</span> {i.description}</p>}
                    {i.observacao && <p><span className="font-semibold text-ep-on-surface-variant">Observação:</span> {i.observacao}</p>}
                  </div>
                )}
              </div>
            ))}
            {!sorted.length && <div className="text-sm text-ep-on-surface-variant">Sem registros.</div>}
          </div>
        </Card>
      </div>
    </Modal>
  );
}

function Modal({ children, title, subtitle, onClose }: { children: React.ReactNode; title: string; subtitle?: string; onClose: () => void }) {
  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="w-full md:max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-ep-surface-lowest p-4 md:p-6 custom-scrollbar border-t md:border border-ep-outline-variant pb-safe" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-ep-outline-variant rounded-full mx-auto mb-3 md:hidden" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-ep-on-surface-variant">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ep-surface-low"><Icon name="close" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ep-outline-variant bg-ep-surface-low p-3">
      <div className="text-[10px] md:text-[11px] uppercase text-ep-on-surface-variant">{label}</div>
      <div className="mt-1 text-base md:text-lg font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-ep-outline-variant bg-ep-surface-lowest p-8 md:p-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ep-surface-low text-ep-primary"><Icon name={icon} /></span>
      <h3 className="mt-3 text-base md:text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ep-on-surface-variant">{body}</p>
      {cta && <button onClick={cta.onClick} className="mt-4 rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary">{cta.label}</button>}
    </div>
  );
}

/* ===================== EXPORT & CONNECTION VIEW ===================== */

function ExportView({ items, config, onSaved }: { items: Reimbursement[]; config: Config; onSaved: () => void }) {
  const [url, setUrl] = useState(config.spreadsheetUrl ?? "");
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const probe = useServerFn(probeSheetFn);
  const save = useServerFn(saveSheetConfigFn);
  const refresh = useServerFn(refreshReimbursementsFn);
  const [sheet, setSheet] = useState(config.sheet ?? "");
  const [mapping, setMapping] = useState<Mapping>(config.mapping ?? {});

  useEffect(() => {
    setUrl(config.spreadsheetUrl ?? "");
    setSheet(config.sheet ?? "");
    setMapping(config.mapping ?? {});
  }, [config.spreadsheetUrl, config.sheet, config.mapping]);

  const detectMeta = async () => {
    if (!url) return;
    setLoading(true); setErr(null);
    try {
      const m = await probe({ data: { url } });
      setMeta(m);
      // If the currently-selected sheet doesn't exist in the new workbook (e.g. user pasted
      // a different URL), fall back to the first sheet — otherwise headers resolve to [].
      const validSheet = m.sheets.some(s => s.title === sheet) ? sheet : (m.sheets[0]?.title ?? "");
      setSheet(validSheet);
      const headers = m.sheets.find(s => s.title === validSheet)?.headers ?? [];

      const guess: Mapping = { ...mapping };
      CANONICAL_FIELDS.forEach(f => {
        if (guess[f.key]) return;
        const match = headers.find(h => {
          const hl = h.toLowerCase();
          const lk = f.key.toLowerCase();
          const ll = f.label.toLowerCase().split("/")[0].trim();
          return hl.includes(lk) || hl.includes(ll) || (f.key === "observacao" && /obs/.test(hl)) || (f.key === "employee" && /(colab|funcion|nome|usuário|user)/.test(hl)) || (f.key === "department" && /(depart|setor|área)/.test(hl)) || (f.key === "amount" && /(valor|total|qtd|montant)/.test(hl)) || (f.key === "date" && /(data|date|dia)/.test(hl)) || (f.key === "status" && /(situa|status)/.test(hl)) || (f.key === "category" && /(categ|benef|tipo)/.test(hl)) || (f.key === "client" && /(client|cliente)/.test(hl));
        });
        if (match) guess[f.key] = match;
      });
      setMapping(guess);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect on mount if URL exists but no meta yet
  useEffect(() => {
    if (config.spreadsheetUrl && !meta) { detectMeta(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.spreadsheetUrl]);

  const sheetHeaders = meta?.sheets.find(s => s.title === sheet)?.headers ?? [];
  const canSave = !!url && !!sheet && !!mapping.date && !!mapping.amount && !!mapping.department && !!mapping.employee && !!mapping.category && !!mapping.status;

  const saveMutation = useMutation({
    mutationFn: async () => save({ data: { url, sheet, mapping } }),
    onSuccess: () => onSaved(),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => refresh(),
    onSuccess: () => onSaved(),
  });

  const exportCSV = () => download(`reembolsos-${new Date().toISOString().slice(0,10)}.csv`, toCSV(items), "text/csv");
  const exportJSON = () => download(`reembolsos-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(items, null, 2), "application/json");

  const sourceLabel = url.toLowerCase().includes("docs.google.com") ? "Google Sheets" : (url.toLowerCase().includes("sharepoint.com") || url.toLowerCase().includes("onedrive") || url.toLowerCase().includes("1drv.ms")) ? "Excel Online" : meta ? (meta.sourceType === "google" ? "Google Sheets" : "Excel Online") : "—";

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardTitle title="Conectar planilha online" subtitle="Cole o link de uma planilha Google Sheets ou Excel Online (SharePoint/OneDrive). Os dados ficam armazenados no banco e atualizam a cada 5 min em todos os dispositivos." />
        <div className="flex flex-col gap-2 md:flex-row">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/... ou https://...sharepoint.com/..." className="flex-1 rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-3 py-2 text-sm" />
          <button onClick={detectMeta} disabled={!url || loading} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">{loading ? "Lendo..." : meta ? "Reanalisar" : "Conectar"}</button>
        </div>
        {err && <p className="mt-2 text-sm text-ep-error">{err}</p>}
        {meta && (
          <div className="mt-3 text-xs text-ep-on-surface-variant">
            Conectado a <span className="font-semibold text-ep-on-surface">{meta.title}</span> ({sourceLabel}) — {meta.sheets.length} aba(s) detectada(s).
          </div>
        )}
        {config.lastSyncAt && (
          <div className="mt-2 text-xs text-ep-on-surface-variant">
            Última sincronização: <span suppressHydrationWarning>{new Date(config.lastSyncAt).toLocaleString("pt-BR")}</span>
            {config.lastSyncError && <span className="ml-2 text-ep-error">· erro: {config.lastSyncError}</span>}
          </div>
        )}
      </Card>

      {meta && (
        <Card>
          <CardTitle title="Mapear colunas" subtitle="Diga ao sistema qual coluna da planilha representa cada campo. Status deve conter 'Pendente' ou 'Realizado'." />
          <div className="mb-3 flex items-center gap-2 text-sm">
            <label className="text-ep-on-surface-variant">Aba:</label>
            <select value={sheet} onChange={e => setSheet(e.target.value)} className="rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5">
              {meta.sheets.map(s => <option key={String(s.id)} value={s.title}>{s.title} ({s.headers.length} colunas)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CANONICAL_FIELDS.map(f => (
              <div key={f.key} className="flex items-center justify-between gap-2 rounded-lg border border-ep-outline-variant bg-ep-surface-low p-3">
                <div>
                  <div className="text-sm font-medium">{f.label} {f.required && <span className="text-ep-error">*</span>}</div>
                  <div className="text-xs text-ep-on-surface-variant">campo do sistema: {f.key}</div>
                </div>
                <select value={mapping[f.key] ?? ""} onChange={e => setMapping({ ...mapping, [f.key]: e.target.value || undefined })} className="min-w-40 rounded-md border border-ep-outline-variant bg-ep-surface-lowest px-2 py-1.5 text-sm">
                  <option value="">— não mapeado —</option>
                  {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="rounded-md border border-ep-outline-variant px-4 py-2 text-sm disabled:opacity-50">
              {refreshMutation.isPending ? "Sincronizando..." : "Sincronizar agora"}
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">
              {saveMutation.isPending ? "Salvando..." : "Salvar mapeamento e sincronizar"}
            </button>
          </div>
          {!canSave && <p className="mt-2 text-xs text-ep-error">Mapeie ao menos: Data, Valor, Departamento, Colaborador, Categoria e Status.</p>}
          {saveMutation.isError && <p className="mt-2 text-sm text-ep-error">{(saveMutation.error as Error).message}</p>}
          {saveMutation.isSuccess && <p className="mt-2 text-sm text-ep-success">Configuração salva. Dados sincronizados.</p>}
        </Card>
      )}

      <Card>
        <CardTitle title="Exportar dados" subtitle={`${items.length} registros disponíveis no cache.`} />
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} disabled={!items.length} className="rounded-md bg-ep-primary px-4 py-2 text-sm text-ep-on-primary disabled:opacity-50">Baixar CSV</button>
          <button onClick={exportJSON} disabled={!items.length} className="rounded-md border border-ep-outline-variant px-4 py-2 text-sm disabled:opacity-50">Baixar JSON</button>
          <button onClick={() => window.print()} className="rounded-md border border-ep-outline-variant px-4 py-2 text-sm">Imprimir / PDF</button>
        </div>
      </Card>
    </div>
  );
}
