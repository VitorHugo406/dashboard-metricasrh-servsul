import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpensePro | Reembolsos" },
      { name: "description", content: "Monitoramento em tempo real dos fluxos de reembolso e métricas operacionais." },
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
  { key: "exportar", icon: "file_upload", label: "Exportar Dados" },
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

type Dept = {
  name: string; total: string; avg: string; growth: string; up: boolean;
  monthly: { m: string; v: number }[];
  categories: { label: string; pct: number; color: string }[];
  collaborators: number;
  approvalRate: string;
};

const departments: Dept[] = [
  {
    name: "Comercial", total: "R$ 840.500", avg: "R$ 2.400", growth: "+14.2%", up: true, collaborators: 350, approvalRate: "96%",
    monthly: [{m:"JAN",v:60},{m:"FEV",v:72},{m:"MAR",v:55},{m:"ABR",v:88},{m:"MAI",v:70},{m:"JUN",v:92}],
    categories: [{label:"Viagens",pct:55,color:"bg-ep-primary"},{label:"Eventos",pct:25,color:"bg-ep-tertiary-container"},{label:"Alimentação",pct:12,color:"bg-ep-secondary-container"},{label:"Outros",pct:8,color:"bg-ep-surface-highest"}],
  },
  {
    name: "Operações", total: "R$ 610.200", avg: "R$ 1.100", growth: "-2.1%", up: false, collaborators: 555, approvalRate: "93%",
    monthly: [{m:"JAN",v:75},{m:"FEV",v:68},{m:"MAR",v:80},{m:"ABR",v:62},{m:"MAI",v:70},{m:"JUN",v:65}],
    categories: [{label:"Transporte",pct:40,color:"bg-ep-primary"},{label:"Alimentação",pct:30,color:"bg-ep-secondary-container"},{label:"Hospedagem",pct:18,color:"bg-ep-tertiary-container"},{label:"Outros",pct:12,color:"bg-ep-surface-highest"}],
  },
  {
    name: "Marketing", total: "R$ 340.000", avg: "R$ 3.800", growth: "+6.5%", up: true, collaborators: 90, approvalRate: "91%",
    monthly: [{m:"JAN",v:50},{m:"FEV",v:60},{m:"MAR",v:72},{m:"ABR",v:65},{m:"MAI",v:78},{m:"JUN",v:84}],
    categories: [{label:"Eventos",pct:48,color:"bg-ep-primary"},{label:"Viagens",pct:22,color:"bg-ep-tertiary-container"},{label:"Material",pct:18,color:"bg-ep-secondary-container"},{label:"Outros",pct:12,color:"bg-ep-surface-highest"}],
  },
  {
    name: "Tecnologia", total: "R$ 180.300", avg: "R$ 900", growth: "+1.2%", up: false, collaborators: 200, approvalRate: "97%",
    monthly: [{m:"JAN",v:30},{m:"FEV",v:35},{m:"MAR",v:32},{m:"ABR",v:40},{m:"MAI",v:38},{m:"JUN",v:42}],
    categories: [{label:"Software",pct:50,color:"bg-ep-primary"},{label:"Equipamentos",pct:28,color:"bg-ep-tertiary-container"},{label:"Viagens",pct:14,color:"bg-ep-secondary-container"},{label:"Outros",pct:8,color:"bg-ep-surface-highest"}],
  },
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

function App() {
  const [tab, setTab] = useState<TabKey>("reembolsos");
  const [dark, setDark] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Dept | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("ep-theme");
    if (stored === "dark") setDark(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ep-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-screen bg-ep-surface text-ep-on-surface">
      <aside className="flex flex-col h-full fixed left-0 top-0 bg-ep-surface-lowest border-r border-ep-outline-variant w-64 z-50">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-ep-primary tracking-tight">ExpensePro</h1>
          <p className="text-xs text-ep-on-surface-variant/70 mt-1 font-semibold uppercase tracking-wider">Enterprise Tier</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-semibold text-left ${
                tab === item.key
                  ? "bg-ep-secondary-container text-ep-on-secondary-container font-bold"
                  : "text-ep-secondary hover:bg-ep-surface-low"
              }`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-ep-outline-variant space-y-1">
          <button
            onClick={() => setDark((d) => !d)}
            className="w-full flex items-center gap-3 px-4 py-3 text-ep-secondary hover:bg-ep-surface-low rounded-lg text-sm font-semibold"
          >
            <Icon name={dark ? "light_mode" : "dark_mode"} />
            <span>{dark ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-ep-secondary hover:bg-ep-surface-low rounded-lg text-sm font-semibold">
            <Icon name="account_circle" />
            <span>Perfil</span>
          </a>
        </div>
      </aside>

      <header className="flex justify-between items-center px-8 h-16 ml-64 bg-ep-surface border-b border-ep-outline-variant fixed top-0 right-0 left-0 z-40">
        <div className="flex items-center gap-4 w-1/3">
          <div className="relative w-full max-w-sm">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-on-surface-variant text-[20px]!" />
            <input
              className="w-full bg-ep-surface-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-ep-primary/20 outline-none text-ep-on-surface"
              placeholder="Buscar dados, colaboradores, relatórios..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-ep-on-surface-variant">
            <button className="p-2 hover:bg-ep-surface-low rounded-full transition-all"><Icon name="calendar_today" /></button>
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
            <div className="w-10 h-10 rounded-full bg-ep-primary text-ep-on-primary flex items-center justify-center font-bold">DE</div>
          </div>
        </div>
      </header>

      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8 space-y-8 max-w-[1440px]">
          {tab === "reembolsos" ? (
            <ReembolsosView onDeptClick={setSelectedDept} />
          ) : (
            <ExportarView />
          )}
        </div>
      </main>

      {selectedDept && <DeptModal dept={selectedDept} onClose={() => setSelectedDept(null)} />}
    </div>
  );
}

function ReembolsosView({ onDeptClick }: { onDeptClick: (d: Dept) => void }) {
  return (
    <>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-ep-on-surface">Visão Geral de Reembolsos</h2>
          <p className="text-base text-ep-on-surface-variant mt-1">Monitoramento em tempo real dos fluxos financeiros e operacionais.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-ep-outline-variant rounded-lg bg-ep-surface-lowest text-sm font-medium hover:bg-ep-surface-low transition-all text-ep-on-surface">
            <Icon name="file_download" className="text-[18px]!" />
            Exportar Relatório
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-ep-primary text-ep-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-sm">
            <Icon name="filter_list" className="text-[18px]!" />
            Filtros Avançados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-ep-surface-lowest border border-ep-outline-variant p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${k.color}`}><Icon name={k.icon} /></div>
              <span className="text-xs font-bold flex items-center text-ep-success">
                <Icon name={k.trendIcon} className="text-[16px]!" />
                {k.trend}
              </span>
            </div>
            <p className="text-xs text-ep-on-surface-variant font-medium">{k.label}</p>
            <p className="text-xl font-bold mt-1 text-ep-on-surface">{k.value}</p>
            <p className="text-[11px] text-ep-on-surface-variant mt-2">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
            <h3 className="text-sm font-bold text-ep-on-surface">Comparativo Mensal: Reembolsado vs. Aprovado vs. Rejeitado</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-primary" /><span className="text-xs text-ep-on-surface-variant">Reembolsado</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-secondary-container" /><span className="text-xs text-ep-on-surface-variant">Aprovado</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-ep-error" /><span className="text-xs text-ep-on-surface-variant">Rejeitado</span></div>
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
            Insights Executivos
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {insights.map((i) => (
              <div key={i.title} className={`p-3 bg-ep-surface-low rounded-lg border-l-4 ${i.border}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-ep-on-surface">{i.title}</p>
                  <span className={`text-[10px] font-bold uppercase ${i.tagColor}`}>{i.tag}</span>
                </div>
                <p className="text-[12px] text-ep-on-surface-variant leading-relaxed">{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl overflow-hidden">
          <div className="p-6 border-b border-ep-outline-variant flex items-center justify-between">
            <h3 className="text-sm font-bold text-ep-on-surface">Ranking por Departamento</h3>
            <span className="text-[11px] text-ep-on-surface-variant">Clique em um departamento para ver detalhes</span>
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
                  <tr
                    key={d.name}
                    onClick={() => onDeptClick(d)}
                    className="hover:bg-ep-surface-low transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-ep-on-surface">
                      <span className="flex items-center gap-2">
                        {d.name}
                        <Icon name="chevron_right" className="text-[16px]! text-ep-on-surface-variant" />
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-right text-ep-on-surface">{d.total}</td>
                    <td className="px-6 py-4 font-mono text-sm text-right text-ep-on-surface">{d.avg}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${d.up ? "bg-ep-secondary-container text-ep-primary" : "bg-ep-error-container text-ep-error"}`}>
                        {d.growth}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
          <h3 className="text-sm font-bold text-ep-on-surface mb-6">Gastos por Categoria</h3>
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" className="text-ep-surface-highest" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" className="text-ep-primary" strokeWidth="4" strokeDasharray="45 55" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" className="text-ep-secondary-container" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-45" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" className="text-ep-tertiary-container" strokeWidth="4" strokeDasharray="12 88" strokeDashoffset="-88" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-ep-on-surface">100%</span>
              <span className="text-[10px] uppercase text-ep-on-surface-variant font-bold tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {categories.map((c) => (
              <div key={c.label} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.color}`} />
                  <span className="text-xs text-ep-on-surface">{c.label}</span>
                </div>
                <span className="text-xs font-bold text-ep-on-surface">{c.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ep-surface-lowest border border-ep-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-ep-outline-variant">
          <h3 className="text-sm font-bold text-ep-on-surface">Transações Recentes</h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px]! text-ep-on-surface-variant" />
              <input className="bg-ep-surface border border-ep-outline-variant rounded-lg py-1.5 pl-10 pr-4 text-sm w-full md:w-64 outline-none focus:ring-2 focus:ring-ep-primary/20 text-ep-on-surface" placeholder="Filtrar por nome ou depto..." />
            </div>
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
                      <span className="text-sm font-bold text-ep-on-surface">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ep-on-surface">{t.dept}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-ep-on-surface">
                      <Icon name={t.catIcon} className="text-[16px]!" />
                      {t.cat}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-right font-bold text-ep-on-surface">{t.value}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${t.statusCls}`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ep-on-surface">{t.date}</td>
                  <td className="px-6 py-4 font-mono text-sm text-right text-ep-on-surface">{t.sla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function DeptModal({ dept, onClose }: { dept: Dept; onClose: () => void }) {
  let offset = 0;
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ep-surface-lowest border border-ep-outline-variant rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-ep-outline-variant">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ep-on-surface-variant font-bold">Departamento</p>
            <h3 className="text-2xl font-bold text-ep-on-surface mt-1">{dept.name}</h3>
            <p className="text-sm text-ep-on-surface-variant mt-1">Prévia de reembolsos e métricas do departamento</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ep-surface-low rounded-full text-ep-on-surface-variant">
            <Icon name="close" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: "Valor Total", v: dept.total, i: "payments" },
              { l: "Média/Colab", v: dept.avg, i: "person" },
              { l: "Colaboradores", v: String(dept.collaborators), i: "groups" },
              { l: "Taxa de Aprovação", v: dept.approvalRate, i: "task_alt" },
            ].map((s) => (
              <div key={s.l} className="bg-ep-surface-low rounded-lg p-4 border border-ep-outline-variant">
                <Icon name={s.i} className="text-ep-primary" />
                <p className="text-[11px] text-ep-on-surface-variant mt-2 font-medium">{s.l}</p>
                <p className="text-lg font-bold text-ep-on-surface">{s.v}</p>
              </div>
            ))}
          </div>

          <div className="bg-ep-surface-low border border-ep-outline-variant rounded-xl p-6">
            <h4 className="text-sm font-bold text-ep-on-surface mb-6">Reembolsos por Mês (R$ mil)</h4>
            <div className="h-56 flex items-end justify-between gap-3 border-b border-ep-outline-variant pb-2">
              {dept.monthly.map((mo) => (
                <div key={mo.m} className="flex-1 flex flex-col items-center gap-2 relative h-full justify-end">
                  <span className="text-[10px] font-bold text-ep-on-surface-variant">{mo.v}</span>
                  <div className="w-full bg-ep-primary rounded-t-md transition-all" style={{ height: `${mo.v}%` }} />
                  <span className="text-[10px] text-ep-on-surface-variant font-bold">{mo.m}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-ep-surface-low border border-ep-outline-variant rounded-xl p-6">
              <h4 className="text-sm font-bold text-ep-on-surface mb-6">Distribuição por Categoria</h4>
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" className="text-ep-surface-highest" strokeWidth="4" />
                  {dept.categories.map((c, idx) => {
                    const dash = `${c.pct} ${100 - c.pct}`;
                    const dashOffset = -offset;
                    offset += c.pct;
                    const colorClass = c.color.replace("bg-", "text-");
                    return (
                      <circle
                        key={idx}
                        cx="18" cy="18" r="15.915"
                        fill="none"
                        stroke="currentColor"
                        className={colorClass}
                        strokeWidth="4"
                        strokeDasharray={dash}
                        strokeDashoffset={dashOffset}
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="mt-6 space-y-2">
                {dept.categories.map((c) => (
                  <div key={c.label} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.color}`} />
                      <span className="text-xs text-ep-on-surface">{c.label}</span>
                    </div>
                    <span className="text-xs font-bold text-ep-on-surface">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ep-surface-low border border-ep-outline-variant rounded-xl p-6">
              <h4 className="text-sm font-bold text-ep-on-surface mb-4">Resumo</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-ep-outline-variant pb-2">
                  <span className="text-ep-on-surface-variant">Crescimento</span>
                  <span className={`font-bold ${dept.up ? "text-ep-success" : "text-ep-error"}`}>{dept.growth}</span>
                </div>
                <div className="flex justify-between border-b border-ep-outline-variant pb-2">
                  <span className="text-ep-on-surface-variant">Categoria principal</span>
                  <span className="font-bold text-ep-on-surface">{dept.categories[0].label}</span>
                </div>
                <div className="flex justify-between border-b border-ep-outline-variant pb-2">
                  <span className="text-ep-on-surface-variant">Pico mensal</span>
                  <span className="font-bold text-ep-on-surface">
                    {dept.monthly.reduce((a, b) => (a.v > b.v ? a : b)).m}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ep-on-surface-variant">Aprovação</span>
                  <span className="font-bold text-ep-on-surface">{dept.approvalRate}</span>
                </div>
              </div>
              <button className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-ep-primary text-ep-on-primary rounded-lg text-sm font-medium">
                <Icon name="file_download" className="text-[18px]!" />
                Exportar dados do departamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportarView() {
  const [provider, setProvider] = useState<"google" | "microsoft">("google");
  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState<{ provider: string; url: string } | null>(null);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setConnected({ provider, url: url.trim() });
  };

  return (
    <>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-ep-on-surface">Exportar Dados</h2>
        <p className="text-base text-ep-on-surface-variant mt-1">Conecte planilhas externas para sincronizar e exportar dados de reembolsos.</p>
      </div>

      <div className="bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-ep-primary-container/10 text-ep-primary">
            <Icon name="sync_alt" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ep-on-surface">Reembolsos — Integração com Planilha</h3>
            <p className="text-sm text-ep-on-surface-variant">Anexe o link de uma planilha do Google Sheets ou Microsoft Excel Online para puxar os dados de reembolsos.</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-ep-on-surface-variant uppercase tracking-wider">Provedor</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { id: "google" as const, label: "Google Sheets", icon: "table_chart" },
                { id: "microsoft" as const, label: "Excel Online", icon: "grid_on" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                    provider === p.id
                      ? "border-ep-primary bg-ep-secondary-container text-ep-on-secondary-container"
                      : "border-ep-outline-variant text-ep-secondary hover:bg-ep-surface-low"
                  }`}
                >
                  <Icon name={p.icon} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sheet-url" className="text-xs font-bold text-ep-on-surface-variant uppercase tracking-wider">
              Link da planilha de reembolsos
            </label>
            <input
              id="sheet-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={provider === "google"
                ? "https://docs.google.com/spreadsheets/d/..."
                : "https://onedrive.live.com/edit.aspx?..."}
              className="w-full mt-2 bg-ep-surface-low border border-ep-outline-variant rounded-lg py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-ep-primary/20 text-ep-on-surface"
            />
            <p className="text-[11px] text-ep-on-surface-variant mt-2">
              Certifique-se de que a planilha está compartilhada com permissão de leitura.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-ep-primary text-ep-on-primary rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Icon name="link" className="text-[18px]!" />
              Conectar planilha
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-ep-outline-variant rounded-lg text-sm font-medium hover:bg-ep-surface-low text-ep-on-surface"
            >
              <Icon name="file_download" className="text-[18px]!" />
              Baixar CSV de reembolsos
            </button>
          </div>
        </form>

        {connected && (
          <div className="mt-6 p-4 rounded-lg bg-ep-secondary-container/40 border border-ep-primary/30 flex items-start gap-3">
            <Icon name="check_circle" className="text-ep-success" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ep-on-surface">
                Conectado a {connected.provider === "google" ? "Google Sheets" : "Excel Online"}
              </p>
              <p className="text-xs text-ep-on-surface-variant truncate">{connected.url}</p>
            </div>
            <button onClick={() => setConnected(null)} className="text-xs font-bold text-ep-primary">
              Desconectar
            </button>
          </div>
        )}
      </div>

      <div className="bg-ep-surface-lowest border border-ep-outline-variant rounded-xl p-6">
        <h3 className="text-base font-bold text-ep-on-surface mb-4">Histórico de exportações</h3>
        <div className="space-y-3">
          {[
            { date: "12 Out, 2024", file: "reembolsos_outubro.csv", size: "248 KB" },
            { date: "01 Out, 2024", file: "reembolsos_setembro.csv", size: "312 KB" },
          ].map((h) => (
            <div key={h.file} className="flex items-center justify-between p-3 rounded-lg bg-ep-surface-low border border-ep-outline-variant">
              <div className="flex items-center gap-3">
                <Icon name="description" className="text-ep-on-surface-variant" />
                <div>
                  <p className="text-sm font-bold text-ep-on-surface">{h.file}</p>
                  <p className="text-[11px] text-ep-on-surface-variant">{h.date} · {h.size}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-ep-surface-lowest rounded-lg text-ep-on-surface-variant">
                <Icon name="download" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
