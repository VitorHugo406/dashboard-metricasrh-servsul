import { createServerFn } from "@tanstack/react-start";
import { getSpreadsheetMetaData, detectSource } from "./sheets.functions";
import { parseDate } from "@/features/reimb/normalize";
import type { Config, Mapping, Reimbursement } from "@/features/reimb/types";
import type { RawReimbursementRow } from "./reimb-sync.server";

export type { RawReimbursementRow } from "./reimb-sync.server";

export const getSheetConfigFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<Config | null> => {
    const { getSheetConfig } = await import("./reimb-sync.server");
    return getSheetConfig();
  });

export const saveSheetConfigFn = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string; sheet: string; mapping: Mapping }) => d)
  .handler(async ({ data }): Promise<{ ok: true; config: Config }> => {
    const { saveSheetConfig } = await import("./reimb-sync.server");
    return saveSheetConfig(data);
  });

export const refreshReimbursementsFn = createServerFn({ method: "POST" })
  .handler(
    async (): Promise<{ ok: boolean; count: number; error?: string }> => {
      const { refreshReimbursements } = await import("./reimb-sync.server");
      return refreshReimbursements();
    },
  );

export const probeSheetFn = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    detectSource(data.url);
    return getSpreadsheetMetaData(data.url);
  });

export const getReimbursementCacheFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<RawReimbursementRow[]> => {
    const { getReimbursementCache } = await import("./reimb-sync.server");
    return getReimbursementCache();
  });

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
