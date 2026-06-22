# Plano de entrega — Reembolsos v2

Vou entregar tudo em uma única leva, testado, antes de devolver para você. Abaixo o escopo completo e algumas decisões que preciso confirmar.

## O que vai mudar

### 1. Status correto (Pendente / Realizado)
- Remover toda a lógica de "Em Aprovação" / "Aprovado" / "Pago".
- Apenas dois estados:
  - **Pendente** — reembolso ainda não pago
  - **Realizado** — reembolso já pago
- KPI "Taxa de Aprovação" vira **"Taxa de Pagamento"** (% de Realizados / total).
- Insights recalculados sobre esses dois estados.

### 2. Suporte a Excel Online (além de Google Sheets)
- Cole o link do Excel Online (`https://...sharepoint.com/...` ou `onedrive.live.com/...`) **ou** do Google Sheets — o app detecta o tipo pelo domínio.
- Excel Online usa o conector Microsoft Excel (Microsoft Graph).
- Mesma UX de mapeamento (escolher aba e qual coluna é Data, Valor, Departamento, Colaborador, Categoria, Status, **Observação**, etc.).

> ⚠️ **Decisão importante:** o conector Microsoft Excel se autentica como **uma conta** (a que faz o login). Para funcionar com a planilha da sua empresa, você precisa:
> - **Opção A (mais simples, recomendada):** uma conta Microsoft de serviço da empresa com acesso ao arquivo, e você conecta essa conta uma vez. Todos no app veem os mesmos dados.
> - **Opção B (cada usuário entra com a própria conta Microsoft):** exige cadastrar um App no Azure AD, configurar OAuth próprio, e cada usuário faz login. Mais trabalho e demora dias para um admin de TI da sua empresa liberar.
> Vou seguir com a **Opção A**. Quando você conectar o Microsoft Excel, escolha uma conta que tenha acesso ao arquivo compartilhado.

### 3. Persistência no banco (não some mais)
- Ativar **Lovable Cloud**.
- Tabela `sheet_config` (linha única, global) armazena: URL da planilha, tipo (`google` ou `excel`), aba escolhida, mapeamento de colunas, timestamp da última sincronização.
- Tabela `reimbursement_cache` guarda as linhas normalizadas da última sincronização. Todos os dispositivos leem da mesma fonte.
- Job de refresh a cada 5 minutos: server function `refreshReimbursements` busca a planilha via conector, normaliza e regrava o cache. Disparada de duas formas:
  - **Cron externo** (URL pública `/api/public/sync-reimb`) — para garantir 5/5 min mesmo sem ninguém aberto.
  - **No cliente** quando algum dispositivo está aberto (`refetchInterval: 5 min`) — chama a mesma server function.
- Configuração sobrevive a reload, troca de dispositivo, deploy.

### 4. Histórico do funcionário
- Clicar em uma linha de "Últimas Solicitações" abre um painel com:
  - Nome, departamento, total reembolsado, último status
  - Histórico completo (data, valor, categoria, status, **observação** lida da coluna mapeada)
  - Tendência mensal em mini-gráfico
- Mesma UX em mobile (bottom sheet) e desktop (modal lateral).

### 5. PWA
- `public/manifest.webmanifest` (nome, ícones, theme color, `display: standalone`).
- Ícones 192/512 gerados.
- Tags no `<head>` para iOS/Android.
- **Sem service worker para offline** (você não pediu) — apenas instalação na tela inicial.

### 6. Mobile responsivo (design dos mocks)
- Breakpoint `< 768px`: layout móvel novo seguindo os HTMLs anexados — top bar fixa, KPIs em grid 2×2 com sparklines, donut de categorias, insights com `glass-panel`, lista de transações em cards arredondados, **bottom nav fixa** com 4 ícones (Dashboard, Reembolsos, Analytics, Exportação).
- Breakpoint `≥ 768px`: mantém o sidebar lateral atual.
- Tokens semânticos (`bg-background`, `text-foreground`, etc.) para o dark mode funcionar nos dois layouts.
- Bottom sheet (Drawer) para mobile, modal para desktop.

### 7. Bug do dark mode (hydration)
- O `<ThemeToggle>` está renderizando ícone diferente no servidor vs cliente. Resolver com `useState(false)` + `useEffect` para só montar o ícone após mount (evita mismatch).

### 8. Compatibilidade Vercel
- Stack atual (TanStack Start + Vite) já é compatível.
- `/api/public/sync-reimb` como server route (sem auth) para o cron externo.
- Variáveis lidas via `process.env` no server, `import.meta.env` no client.
- Vou validar `bun run build` antes de devolver.

## Arquitetura técnica

```
DB (Lovable Cloud)
├── sheet_config         (1 linha global: url, type, mapping, last_sync)
└── reimbursement_cache  (linhas normalizadas: date, amount, dept, employee, …, observacao)

Server functions (src/lib/*.functions.ts)
├── getSheetConfig
├── saveSheetConfig      (URL + mapping)
├── getReimbursements    (lê do cache)
├── refreshReimbursements (busca conector → normaliza → grava cache)
└── getSheetMeta         (detecta google/excel, retorna abas+headers para o wizard)

Server routes (src/routes/api/public/)
└── sync-reimb.ts        (chama refreshReimbursements; protegido por SYNC_SECRET)

Connectors
├── google_sheets        (já conectado)
└── microsoft_excel      (vou pedir para conectar)
```

## Testes que vou rodar antes de entregar

1. Conectar Google Sheet → mapear colunas (com Observação) → ver KPIs e gráficos.
2. Conectar Excel Online → mapear → mesmo resultado.
3. Fechar e reabrir em outro navegador → configuração persiste, dados carregam do BD.
4. Forçar refresh manual e esperar o ciclo de 5 min.
5. Clicar em transação → ver histórico + observação.
6. Toggle dark/light → sem hydration mismatch, sem flicker.
7. Mobile (375px) → layout dos mocks. Desktop (1440px) → layout sidebar atual.
8. Instalar como PWA no celular.
9. `bun run build` passa.

## Confirme antes de eu começar

1. **Conta Microsoft para o conector Excel:** OK seguir com **Opção A** (uma conta corporativa de serviço conecta uma vez, vale para todos)?
2. **Cron de 5 min:** OK eu usar um endpoint público `/api/public/sync-reimb` protegido por um segredo que você configura num cron externo (cron-job.org grátis), **OU** você prefere que o refresh aconteça só quando alguém abrir o app (sem cron externo)?

Responda essas duas e eu sigo executando até o fim.
