
## Visão geral

Reconstruir o app "Reembolsos" para operar com dados reais vindos de uma planilha do Google Sheets (com auto-refresh de 5 em 5 min), com mapeamento configurável de colunas, insights gerados a partir dos dados, filtros e exportação funcionais, comparações personalizadas, notificações reais e dark mode corrigido.

## 1. Correção do Dark Mode

- Tailwind v4: configurar `@custom-variant dark (&:where(.dark, .dark *))` em `src/styles.css` e aplicar a classe `dark` no `<html>` (não num div interno) via `useEffect` + `document.documentElement.classList`.
- Persistir em `localStorage` e respeitar `prefers-color-scheme` no primeiro load.
- Auditar todas as classes hardcoded (`bg-white`, `text-black`, `bg-gray-*`) e migrar para tokens semânticos (`bg-background`, `text-foreground`, `bg-card`, `border-border`).

## 2. Integração real com Google Sheets

- Adicionar conector Google Sheets (gateway Lovable). Tela de "Exportar/Importar Dados" passa a ter:
  - Campo de URL da planilha + botão "Conectar".
  - Detecção automática de abas (`/spreadsheets/{id}`) e colunas (primeira linha da aba escolhida).
  - **Tela de mapeamento**: para cada campo canônico do sistema (Data, Valor, Departamento, Colaborador, Cliente, Categoria, Status, Descrição, Comprovante), o usuário escolhe a Aba + Coluna correspondente.
  - Salvar mapeamento + URL em `localStorage` (`reimbursement_config`).
- Cliente de leitura usa `values:batchGet` para puxar apenas as colunas mapeadas.
- **Auto-refresh a cada 5 min** via `setInterval` + `useQuery` com `refetchInterval: 300_000`; indicador "Última atualização: hh:mm".
- Botão "Atualizar agora" para forçar refetch.
- Estado vazio quando ainda não conectado: instruções e exemplo de planilha.

## 3. Modelo de dados normalizado

Após ler a planilha, converter para:
```ts
type Reimbursement = {
  date: Date; amount: number; department: string;
  employee: string; client?: string; category: string;
  status: 'aprovado'|'rejeitado'|'pendente'; description?: string;
}
```
Todos os KPIs, gráficos, ranking e modais passam a derivar dessa lista (sem mocks).

## 4. Insights Executivos reais e personalizados

Calculados em tempo real:
- Variação % do total reembolsado vs. período anterior equivalente.
- Categoria/benefício com maior crescimento (alerta de atenção).
- Departamento com queda na taxa de aprovação.
- **Cliente em destaque**: cliente com salto >30% de reembolso no período selecionado → insight de atenção com nome, valor e variação.
- Tempo médio de aprovação em alta/baixa.
- Cada insight tem severidade (positivo/atenção/crítico), título, descrição e período de referência.

## 5. Filtros e comparação personalizada

- Barra de filtros global: período, departamento, categoria, cliente, status.
- Filtros realmente aplicados a KPIs, gráficos e tabelas.
- **Comparações pré-definidas + personalizada**:
  - Esta semana vs. semana anterior
  - Este mês vs. mês anterior
  - Este mês vs. mesmo mês do ano passado
  - Últimos 30/90 dias vs. período anterior equivalente
  - Personalizado: o usuário escolhe dois intervalos de datas
- KPIs mostram delta % e seta ↑/↓ baseados na comparação ativa.

## 6. Exportação funcional

- Botões "Exportar CSV" e "Exportar JSON" baixam os dados filtrados (Blob + `URL.createObjectURL`).
- "Exportar relatório PDF" simples via `window.print()` com CSS de impressão dedicada.
- Histórico de exportações em `localStorage`.

## 7. Notificações reais

Geradas a partir dos dados:
- Novos reembolsos pendentes (>24h sem aprovação).
- Reembolsos rejeitados na última semana.
- Alertas de variação anômala por cliente/departamento.
- Falha na sincronização da planilha.

Badge com contador real e dropdown com lista clicável (filtra a tabela).

## 8. Modal de departamento

Reaproveitar dados reais filtrados pelo departamento clicado: KPIs, série mensal, distribuição por categoria, top 5 colaboradores, top clientes.

## 9. Estrutura técnica

```
src/
  routes/
    __root.tsx
    index.tsx                  # shell + tabs
  features/reimbursements/
    types.ts                   # Reimbursement, Mapping, Insight
    config-store.ts            # localStorage para URL + mapeamento + tema
    sheets-client.ts           # fetch via gateway Google Sheets
    normalize.ts               # linhas brutas -> Reimbursement[]
    analytics.ts               # KPIs, agrupamentos, comparações
    insights.ts                # geração de insights
    notifications.ts           # geração de notificações
    components/
      FiltersBar.tsx
      ComparisonPicker.tsx
      KpiCard.tsx
      MonthlyChart.tsx
      CategoryDonut.tsx
      DepartmentRanking.tsx
      DepartmentModal.tsx
      InsightsPanel.tsx
      NotificationsDropdown.tsx
      TransactionsTable.tsx
      ExportPanel.tsx
      ConnectSheetPanel.tsx
      MappingWizard.tsx
      ThemeToggle.tsx
```

## 10. Testes manuais antes de entregar

- Conectar conta Google Sheets de demo, mapear colunas, validar que KPIs batem com a planilha.
- Trocar de tema claro/escuro em todas as telas (incluindo modais).
- Aplicar filtros e cada modo de comparação; conferir deltas.
- Forçar refetch e aguardar 5 min para validar auto-refresh.
- Exportar CSV/JSON e abrir os arquivos.
- Disparar notificação (ex.: planilha com reembolso pendente antigo).

## Detalhes técnicos

- Conector: `standard_connectors--connect` com `google_sheets`. Endpoints: `/spreadsheets/{id}` (metadata/abas) e `/spreadsheets/{id}/values:batchGet?ranges=...`.
- Toda a leitura via server function `getSheetData` em `src/lib/sheets.functions.ts` para não expor `LOVABLE_API_KEY` no client; client usa `useServerFn` + `useQuery({ refetchInterval: 300_000 })`.
- Configuração (URL + mapeamento + comparação ativa + tema) em `localStorage` — sem necessidade de DB.
- Dark mode com `document.documentElement.classList.toggle('dark', ...)`.

## Pergunta para confirmar antes de implementar

Você quer usar a conexão Google Sheets gerenciada pela Lovable (uma conta Google compartilhada que você autoriza uma vez) ou prefere que cada usuário final faça login com a própria conta Google (requer OAuth próprio — mais setup)? Para o caso de uso descrito, a primeira opção é suficiente e muito mais rápida.
