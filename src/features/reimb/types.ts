export type ReimbStatus = "aprovado" | "rejeitado" | "pendente";

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
  submittedAt?: Date;
};

export const CANONICAL_FIELDS = [
  { key: "date", label: "Data", required: true },
  { key: "amount", label: "Valor", required: true },
  { key: "department", label: "Departamento", required: true },
  { key: "employee", label: "Colaborador", required: true },
  { key: "client", label: "Cliente", required: false },
  { key: "category", label: "Categoria/Benefício", required: true },
  { key: "status", label: "Status", required: true },
  { key: "description", label: "Descrição", required: false },
  { key: "submittedAt", label: "Data de envio", required: false },
] as const;

export type FieldKey = typeof CANONICAL_FIELDS[number]["key"];

export type Mapping = Partial<Record<FieldKey, string>>; // canonical -> spreadsheet column header

export type Config = {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetTitle?: string;
  sheet?: string;
  mapping?: Mapping;
};

export type ComparisonMode =
  | "wow" // week vs prev week
  | "mom" // month vs prev month
  | "yoy" // this month vs same month last year
  | "30d"
  | "90d"
  | "custom";

export type DateRange = { from: Date; to: Date };

export type Filters = {
  range?: DateRange;
  department?: string;
  category?: string;
  client?: string;
  status?: ReimbStatus;
  search?: string;
};
