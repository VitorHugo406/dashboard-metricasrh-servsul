export type ReimbStatus = "pendente" | "realizado";

export type SourceType = "google" | "excel";

export type Reimbursement = {
  id: string;
  date: Date;
  amount: number;
  department: string;
  employee: string;
  client: string;
  category: string;
  status: ReimbStatus;
  description: string;
  observacao: string;
  submittedAt?: Date;
};

export const CANONICAL_FIELDS = [
  { key: "date", label: "Data", required: true },
  { key: "amount", label: "Valor", required: true },
  { key: "department", label: "Departamento", required: true },
  { key: "employee", label: "Colaborador", required: true },
  { key: "client", label: "Cliente", required: false },
  { key: "category", label: "Categoria/Benefício", required: true },
  { key: "status", label: "Status (Pendente / Realizado)", required: true },
  { key: "description", label: "Descrição", required: false },
  { key: "observacao", label: "Observação", required: false },
  { key: "submittedAt", label: "Data de envio", required: false },
] as const;

export type FieldKey = typeof CANONICAL_FIELDS[number]["key"];

export type Mapping = Partial<Record<FieldKey, string>>;

export type Config = {
  sourceType?: SourceType;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetTitle?: string;
  sheet?: string;
  mapping?: Mapping;
  lastSyncAt?: string;
  lastSyncError?: string | null;
};

export type ComparisonMode = "wow" | "mom" | "yoy" | "30d" | "90d" | "custom";

export type DateRange = { from: Date; to: Date };

export type Filters = {
  range?: DateRange;
  department?: string;
  category?: string;
  client?: string;
  status?: ReimbStatus;
  search?: string;
};

export type SheetMeta = {
  sourceType: SourceType;
  spreadsheetId: string;
  title: string;
  sheets: { id: string | number; title: string; headers: string[] }[];
  excelDriveId?: string;
  excelItemId?: string;
};
