import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpensePro | Executive Dashboard" },
      { name: "description", content: "Real-time monitoring of expense reimbursement flows and operational metrics." },
      { property: "og:title", content: "ExpensePro | Executive Dashboard" },
      { property: "og:description", content: "Real-time monitoring of expense reimbursement flows and operational metrics." },
    ],
  }),
  component: Dashboard,
});

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const navItems = [
  { icon: "dashboard", label: "Dashboard", active: true },
  { icon: "receipt_long", label: "Refunds" },
  { icon: "analytics", label: "Analytics" },
  { icon: "compare_arrows", label: "Comparisons" },
  { icon: "fact_check", label: "Audit" },
  { icon: "description", label: "Reports" },
  { icon: "group", label: "Users" },
  { icon: "settings", label: "Settings" },
];

const kpis = [
  { icon: "payments", color: "text-ep-primary bg-ep-primary-container/10", label: "Total Reembolsado", value: "R$ 2.450.000", trend: "12.5%", trendIcon: "trending_up", note: "vs. mês anterior" },
  { icon: "savings", color: "text-ep-tertiary bg-ep-tertiary-container/10", label: "Economia Gerada", value: "R$ 385.000", trend: "8%", trendIcon: "trending_up", note: "Compliance & Auditoria" },
  { icon: "timer", color: "text-ep-secondary bg-ep-secondary-container/30", label: "Tempo Médio Aprovação", value: "2.1 dias", trend: "0.4d", trendIcon: "trending_down", note: "Otimização de Workflow" },
  { icon: "task_alt", color: "text-ep-secondary bg-ep-secondary-container/30", label: "Taxa de Aprovação", value: "94%", trend: "2%", trendIcon: "trending_up", note: "Eficiência operacional" },
];

const months = [
  { m: "JAN", a: 70, b: 60, c: 10 },
  { m: "FEV", a: 80, b: 72, c: 8 },
  { m: "MAR", a: 65, b: 58, c: 12 },
  { m: "ABR", a: 90, b: 85, c: 5 },
  { m: "MAI", a: 75, b: 68, c: 10 },
  { m: "JUN", a: 85, b: 78, c: 7 },
];

const insights = [
  { title: "Alertas de Anomalia", tag: "Crítico", tagColor: "text-ep-error", border: "border-ep-error", body: 'Detectado aumento atípico de 45% em "Eventos" no Departamento Comercial neste mês.' },
  { title: "Centro de Custos", tag: "Update", tagColor: "text-ep-primary", border: "border-ep-primary", body: "Operações (SP) representa 32% do volume total de solicitações em 2024." },
  { title: "Oportunidades", tag: "Sugerido", tagColor: "text-ep-success", border: "border-ep-success", body: "Centralização de reservas de hotel pode reduzir custos em até R$ 45k/mês." },
];

const departments = [
  { name: "Comercial", total: "R$ 840.500", avg: "R$ 2.400", growth: "+14.2%", up: true },
  { name: "Operações", total: "R$ 610.200", avg: "R$ 1.100", growth: "-2.1%", up: false },
  { name: "Marketing", total: "R$ 340.000", avg: "R$ 3.800", growth: "+6.5%", up: true },
  { name: "Tecnologia", total: "R$ 180.300", avg: "R$ 900", growth: "+1.2%", up: false },
];

const transactions = [
  { initials: "RM", bg: "bg-ep-primary-container", name: "Ricardo Malta", dept: "Comercial", catIcon: "flight", cat: "Viagens", value: "R$ 1.240,50", status: "Em Aprovação", statusCls: "bg-ep-secondary-container text-ep-primary", date: "12 Out, 2024", sla: "1.2d" },
  { initials: "AS", bg: "bg-ep-on-secondary-container", name: "Ana Silva", dept: "Marketing", catIcon: "restaurant", cat: "Alimentação", value: "R$ 85,90", status: "Pago", statusCls: "bg-green-100 text-ep-success", date: "11 Out, 2024", sla: "0.4d" },
  { initials: "JP", bg: "bg-ep-error", name: "João Paulo", dept: "Tecnologia", catIcon: "commute", cat: "Transporte", value: "R$ 420,00", status: "Rejeitado", statusCls: "bg-ep-error-container text-ep-error", date: "10 Out, 2024", sla: "2.8d" },
];

const categories = [
  { color: "bg-ep-primary", label: "Viagens", pct: "45%" },
  { color: "bg-ep-secondary-container", label: "Hospedagem", pct: "25%" },
  { color: "bg-ep-surface-highest", label: "Alimentação", pct: "18%" },
  { color: "bg-ep-tertiary-container", label: "Outros", pct: "12%" },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-ep-surface">
      {/* Sidebar */}
      <aside className="flex flex-col h-full fixed left-0 top-0 bg-ep-surface-lowest border-r border-ep-outline-variant w-64 z-50">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-ep-primary tracking-tight">ExpensePro</h1>
          <p className="text-xs text-ep-on-surface-variant/70 mt-1 font-semibold uppercase tracking-wider">Enterprise Tier</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-semibold ${
                item.active
                  ? "bg-ep-secondary-container text-ep-on-secondary-container font-bold"
                  : "text-ep-secondary hover:bg-ep-surface-low"
              }`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-ep-outline-variant">
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-ep-secondary hover:bg-ep-surface-low rounded-lg text-sm font-semibold">
            <Icon name="account_circle" />
            <span>Profile</span>
          </a>
        </div>
      </aside>

      {/* Topbar */}
      <header className="flex justify-between items-center px-8 h-16 ml-64 bg-ep-surface border-b border-ep-outline-variant fixed top-0 right-0 left-0 z-40">
        <div className="flex items-center gap-4 w-1/3">
          <div className="relative w-full max-w-sm">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-on-surface-variant text-[20px]!" />
            <input
              className="w-full bg-ep-surface-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-ep-primary/20 outline-none"
              placeholder="Search data, employees, reports..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-ep-on-surface-variant">
            <button className="p-2 hover:bg-ep-surface-low rounded-full transition-all"><Icon name="calendar_today" /></button>
            <button className="p-2 hover:bg-ep-surface-low rounded-full transition-all"><Icon name="domain" /></button>
            <button className="p-2 hover:bg-ep-surface-low rounded-full transition-all relative">
              <Icon name="notifications" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-ep-error rounded-full" />
            </button>
          </div>
          <div className="h-8 w-px bg-ep-outline-variant" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-ep-on-surface">Diretoria Executiva</p>
              <p className="text-[10px] text-ep-on-surface-variant uppercase tracking-wider">Acesso Master</p>
            </div>
            <img
              className="w-10 h-10 rounded-full object-cover border border-ep-outline-variant"
              alt="Executive avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWVH3z7OncS7bbkz3RYg_VDyM5EevBi7EULQuY1BV17AHnYId0qji63ht76YtPaMx7ojqGpNHrKhysdrBtMiF6ApyznZIsxEpzESFVGagwuf2ApsUBYeKK3pEMcXuQYrIssDxWV1tLJgNy2as4csPGVzMZcFgltlCLcFEf9Rw0-caS8R3mCEyekO3fUePKq8_AC112dY1grhX0GVvS_o3scuoAw2hv_D12Wq9jFZ690_CKg6ItF42MLgKflITYmNqVABysmioZJbMA"
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8 space-y-8 max-w-[1440px]">
          {/* Page header */}
          <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ep-on-surface">Visão Geral de Reembolsos</h2>
              <p className="text-base text-ep-on-surface-variant mt-1">Monitoramento em tempo real dos fluxos financeiros e operacionais.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-ep-outline-variant rounded-lg bg-ep-surface-lowest text-sm font-medium hover:bg-ep-surface-low transition-all">
                <Icon name="file_download" className="text-[18px]!" />
                Exportar Relatório
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-ep-primary text-ep-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-sm">
                <Icon name="filter_list" className="text-[18px]!" />
                Filtros Avançados
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k) => (
              <div key={k.label} className="bg-ep-surface-lowest border border-ep-outline-variant p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${k.color}`}>
                    <Icon name={k.icon} />
                  </div>
                  <span className="text-xs font-bold flex items-center text-ep-success">
                    <Icon name={k.trendIcon} className="text-[16px]!" />
                    {k.trend}
                  </span>
                </div>
                <p className="text-xs text-ep-on-surface-variant font-medium">{k.label}</p>
                <p className="text-xl font-bold mt-1">{k.value}</p>
                <p className="text-[11px] text-ep-on-surface-variant mt-2">{k.note}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
              <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
                <h3 className="text-sm font-bold text-ep-on-surface">Comparativo Mensal: Reembolsado vs. Aprovado vs. Rejeitado</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-primary" /><span className="text-xs">Reembolsado</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-secondary-container" /><span className="text-xs">Aprovado</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-error" /><span className="text-xs">Rejeitado</span></div>
                </div>
              </div>
              <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-ep-outline-variant pb-2">
                {months.map((mo) => (
                  <div key={mo.m} className="flex-1 flex items-end justify-center gap-1 relative">
                    <div className="w-4 bg-ep-primary rounded-t-sm" style={{ height: `${mo.a}%` }} />
                    <div className="w-4 bg-ep-secondary-container rounded-t-sm" style={{ height: `${mo.b}%` }} />
                    <div className="w-4 bg-ep-error rounded-t-sm" style={{ height: `${mo.c}%` }} />
                    <span className="absolute -bottom-6 text-[10px] text-ep-on-surface-variant font-bold">{mo.m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6 flex flex-col">
              <h3 className="text-sm font-bold text-ep-on-surface mb-6 flex items-center gap-2">
                <Icon name="auto_awesome" className="text-ep-primary" />
                Executive Insights
              </h3>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {insights.map((i) => (
                  <div key={i.title} className={`p-3 bg-ep-surface-low rounded-lg border-l-4 ${i.border}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold">{i.title}</p>
                      <span className={`text-[10px] font-bold uppercase ${i.tagColor}`}>{i.tag}</span>
                    </div>
                    <p className="text-[12px] text-ep-on-surface-variant leading-relaxed">{i.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl overflow-hidden">
              <div className="p-6 border-b border-ep-outline-variant">
                <h3 className="text-sm font-bold text-ep-on-surface">Ranking por Departamento</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-ep-surface-low">
                    <tr>
                      <th className="px-6 py-3 text-[11px] uppercase font-bold text-ep-on-surface-variant tracking-wider">Departamento</th>
                      <th className="px-6 py-3 text-[11px] uppercase font-bold text-ep-on-surface-variant text-right tracking-wider">Valor Total</th>
                      <th className="px-6 py-3 text-[11px] uppercase font-bold text-ep-on-surface-variant text-right tracking-wider">Média/Colab</th>
                      <th className="px-6 py-3 text-[11px] uppercase font-bold text-ep-on-surface-variant text-center tracking-wider">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ep-outline-variant">
                    {departments.map((d) => (
                      <tr key={d.name} className="hover:bg-ep-surface-low transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{d.name}</td>
                        <td className="px-6 py-4 font-mono text-sm text-right">{d.total}</td>
                        <td className="px-6 py-4 font-mono text-sm text-right">{d.avg}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${d.up ? "bg-ep-error-container text-ep-error" : "bg-ep-secondary-container text-ep-primary"}`}>
                            {d.growth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Donut */}
            <div className="lg:col-span-4 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
              <h3 className="text-sm font-bold text-ep-on-surface mb-6">Gastos por Categoria</h3>
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e1e1ee" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#004bca" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d0e1fb" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-45" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#c73f00" strokeWidth="4" strokeDasharray="12 88" strokeDashoffset="-88" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold">100%</span>
                  <span className="text-[10px] uppercase text-ep-on-surface-variant font-bold tracking-widest">Total</span>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {categories.map((c) => (
                  <div key={c.label} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.color}`} />
                      <span className="text-xs">{c.label}</span>
                    </div>
                    <span className="text-xs font-bold">{c.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions table */}
          <div className="bg-ep-surface-lowest border border-ep-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-ep-outline-variant">
              <h3 className="text-sm font-bold text-ep-on-surface">Transações Recentes</h3>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px]! text-ep-on-surface-variant" />
                  <input className="bg-ep-surface border border-ep-outline-variant rounded-lg py-1.5 pl-10 pr-4 text-sm w-full md:w-64 outline-none focus:ring-2 focus:ring-ep-primary/20" placeholder="Filtrar por nome ou depto..." />
                </div>
                <button className="p-2 border border-ep-outline-variant rounded-lg hover:bg-ep-surface-low transition-colors">
                  <Icon name="tune" className="text-[18px]!" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-ep-surface-low">
                  <tr>
                    {["Colaborador", "Departamento", "Categoria", "Valor", "Status", "Data", "SLA"].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[11px] uppercase font-bold text-ep-on-surface-variant tracking-wider ${i === 3 || i === 6 ? "text-right" : i === 4 ? "text-center" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ep-outline-variant">
                  {transactions.map((t) => (
                    <tr key={t.name} className="hover:bg-ep-surface-low transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${t.bg} text-white flex items-center justify-center font-bold text-xs`}>{t.initials}</div>
                          <span className="text-sm font-bold">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{t.dept}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Icon name={t.catIcon} className="text-[16px]!" />
                          {t.cat}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-right font-bold">{t.value}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${t.statusCls}`}>{t.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">{t.date}</td>
                      <td className="px-6 py-4 font-mono text-sm text-right">{t.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-ep-outline-variant flex justify-between items-center bg-ep-surface-low/50">
              <span className="text-xs text-ep-on-surface-variant">Mostrando 1-15 de 2.450 resultados</span>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-ep-surface-low rounded-lg transition-colors border border-ep-outline-variant">
                  <Icon name="chevron_left" className="text-[20px]!" />
                </button>
                <button className="p-2 hover:bg-ep-surface-low rounded-lg transition-colors border border-ep-outline-variant">
                  <Icon name="chevron_right" className="text-[20px]!" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
