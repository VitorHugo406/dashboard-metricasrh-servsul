import { createServerFn } from "@tanstack/react-start";
import { fetchSheetData, detectSource, getSpreadsheetMetaData } from "./sheets.functions";
import { normalize, parseDate, toISODate } from "@/features/reimb/normalize";
import type { Config, Mapping, Reimbursement, SourceType } from "@/features/reimb/types";

type ConfigRow = {
  source_type: SourceType;
  spreadsheet_id: string;
  spreadsheet_url: string;
  spreadsheet_title: string | null;
  sheet_name: string;
  mapping: Mapping;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

function resolveDefinitiveReembolsoMapping(headers: string[], saved: Mapping): Mapping {
  const normalizeHeader = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const candidates = headers.map((header) => ({ header, value: normalizeHeader(header) }));
  const first = (patterns: RegExp[]) =>
    candidates.find(({ value }) => patterns.some((pattern) => pattern.test(value)))?.header;
  const hasDefinitiveShape = !!first([/^pagamento$/]) && !!first([/^valor\s*reembolso$/]);
  if (!hasDefinitiveShape) return saved;
  return {
    ...saved,
    date: first([/^pagamento$/]) ?? saved.date,
    amount: first([/^valor\s*reembolso$/]) ?? saved.amount,
    employee: first([/^nome$/]) ?? saved.employee,
    department: first([/^departamento$/]) ?? saved.department,
    category: first([/^tipo\s*reembolso$/]) ?? saved.category,
    status: first([/^status$/]) ?? saved.status,
    description: first([/^motivo$/]) ?? saved.description,
    client: first([/^cliente$/]) ?? saved.client,
    submittedAt: first([/^data\s*da\s*sol\.?$/]) ?? saved.submittedAt,
  };
}

export const getSheetConfigFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<Config | null> => getSheetConfig());

export async function getSheetConfig(): Promise<Config | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("sheet_config").select("*").maybeSingle();
  if (error || !data) return null;
  const row = data as ConfigRow;
  return {
    sourceType: row.source_type,
    spreadsheetId: row.spreadsheet_id,
    spreadsheetUrl: row.spreadsheet_url,
    spreadsheetTitle: row.spreadsheet_title ?? undefined,
    sheet: row.sheet_name,
    mapping: row.mapping ?? {},
    lastSyncAt: row.last_sync_at ?? undefined,
    lastSyncError: row.last_sync_error,
  };
}

export const saveSheetConfigFn = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string; sheet: string; mapping: Mapping }) => d)
  .handler(async ({ data }): Promise<{ ok: true; config: Config }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const meta = await getSpreadsheetMetaData(data.url);
    const selectedHeaders = meta.sheets.find((s) => s.title === data.sheet)?.headers ?? [];
    const mapping = resolveDefinitiveReembolsoMapping(selectedHeaders, data.mapping);
    const row = {
      id: true,
      source_type: meta.sourceType,
      spreadsheet_url: data.url,
      spreadsheet_id: meta.spreadsheetId,
      spreadsheet_title: meta.title,
      sheet_name: data.sheet,
      mapping,
      excel_drive_id: meta.excelDriveId ?? null,
      excel_item_id: meta.excelItemId ?? null,
    };
    const { error } = await supabaseAdmin.from("sheet_config").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Salvar config: ${error.message}`);
    // Trigger an immediate sync after save
    try {
      await refreshReimbursements();
    } catch (e) {
      console.error("initial sync failed", e);
    }
    const cfg = await getSheetConfig();
    return { ok: true, config: cfg! };
  });

export const refreshReimbursementsFn = createServerFn({ method: "POST" })
  .handler(
    async (): Promise<{ ok: boolean; count: number; error?: string }> => refreshReimbursements(),
  );

export async function refreshReimbursements(): Promise<{
  ok: boolean;
  count: number;
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfgRow } = await supabaseAdmin.from("sheet_config").select("*").maybeSingle();
  if (!cfgRow) return { ok: false, count: 0, error: "Nenhuma planilha configurada" };
  const row = cfgRow as ConfigRow;
  try {
    const raw = await fetchSheetData(
      row.source_type,
      row.spreadsheet_url,
      row.spreadsheet_id,
      row.sheet_name,
    );
    const items = normalize(raw.headers, raw.rows, resolveDefinitiveReembolsoMapping(raw.headers, row.mapping));
    // Replace cache
    await supabaseAdmin.from("reimbursement_cache").delete().neq("id", "__never__");
    if (items.length) {
      const records = items.map((i) => ({
        id: i.id,
        date: toISODate(i.date),
        amount: i.amount,
        department: i.department,
        employee: i.employee,
        client: i.client || null,
        category: i.category,
        status: i.status,
        description: i.description || null,
        observacao: i.observacao || null,
        submitted_at: i.submittedAt ? toISODate(i.submittedAt) : null,
      }));
      // chunk inserts
      const chunkSize = 500;
      for (let k = 0; k < records.length; k += chunkSize) {
        const slice = records.slice(k, k + chunkSize);
        const { error } = await supabaseAdmin.from("reimbursement_cache").insert(slice);
        if (error) throw new Error(error.message);
      }
    }
    await supabaseAdmin
      .from("sheet_config")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", true);
    return { ok: true, count: items.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("sheet_config")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: msg })
      .eq("id", true);
    return { ok: false, count: 0, error: msg };
  }
}

export const probeSheetFn = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    detectSource(data.url);
    return getSpreadsheetMetaData(data.url);
  });

export const getReimbursementCacheFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<RawReimbursementRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reimbursement_cache")
      .select(
        "id, date, amount, department, employee, client, category, status, description, observacao, submitted_at",
      )
      .order("date", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);
    return (data ?? []) as RawReimbursementRow[];
  });

export type RawReimbursementRow = {
  id: string;
  date: string;
  amount: number;
  department: string;
  employee: string;
  client: string | null;
  category: string;
  status: "pendente" | "realizado";
  description: string | null;
  observacao: string | null;
  submitted_at: string | null;
};

export function rowsToReimbursements(rows: RawReimbursementRow[]): Reimbursement[] {
  return rows.map((r) => ({
    id: r.id,
    date: parseDate(r.date) ?? new Date(r.date),
    amount: Number(r.amount),
    department: r.department,
    employee: r.employee,
    client: r.client ?? "",
    category: r.category,
    status: r.status,
    description: r.description ?? "",
    observacao: r.observacao ?? "",
    submittedAt: r.submitted_at ? (parseDate(r.submitted_at) ?? new Date(r.submitted_at)) : undefined,
  }));
}
