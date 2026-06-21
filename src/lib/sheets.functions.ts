import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function authHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) throw new Error("Google Sheets connection not configured");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
  } as Record<string, string>;
}

function parseSpreadsheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input)) return input;
  throw new Error("URL ou ID da planilha inválido");
}

export type SheetMeta = {
  spreadsheetId: string;
  title: string;
  sheets: { id: number; title: string; headers: string[] }[];
};

export const getSpreadsheetMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<SheetMeta> => {
    const id = parseSpreadsheetId(data.url);
    const metaRes = await fetch(
      `${GATEWAY}/spreadsheets/${id}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
      { headers: authHeaders() },
    );
    if (!metaRes.ok) throw new Error(`Falha ao ler planilha (${metaRes.status}): ${await metaRes.text()}`);
    const meta = await metaRes.json() as any;
    const sheetTitles: string[] = meta.sheets.map((s: any) => s.properties.title);
    const ranges = sheetTitles.map((t) => `ranges=${encodeURIComponent(`'${t}'!1:1`)}`).join("&");
    const headersRes = await fetch(
      `${GATEWAY}/spreadsheets/${id}/values:batchGet?${ranges}`,
      { headers: authHeaders() },
    );
    if (!headersRes.ok) throw new Error(`Falha ao ler cabeçalhos (${headersRes.status})`);
    const headersJson = await headersRes.json() as any;
    const headersByTitle: Record<string, string[]> = {};
    (headersJson.valueRanges ?? []).forEach((vr: any) => {
      const title = (vr.range ?? "").split("!")[0].replace(/^'|'$/g, "");
      headersByTitle[title] = (vr.values?.[0] ?? []).map((h: any) => String(h));
    });
    return {
      spreadsheetId: id,
      title: meta.properties?.title ?? id,
      sheets: meta.sheets.map((s: any) => ({
        id: s.properties.sheetId,
        title: s.properties.title,
        headers: headersByTitle[s.properties.title] ?? [],
      })),
    };
  });

export const getSheetRows = createServerFn({ method: "POST" })
  .inputValidator((d: { spreadsheetId: string; sheet: string }) => d)
  .handler(async ({ data }): Promise<{ headers: string[]; rows: string[][]; fetchedAt: string }> => {
    const range = `'${data.sheet}'!A1:Z10000`;
    const res = await fetch(
      `${GATEWAY}/spreadsheets/${data.spreadsheetId}/values/${range}`,
      { headers: authHeaders() },
    );
    if (!res.ok) throw new Error(`Falha ao ler dados (${res.status}): ${await res.text()}`);
    const json = await res.json() as any;
    const values: string[][] = json.values ?? [];
    const [headers = [], ...rows] = values;
    return { headers: headers.map(String), rows: rows.map(r => r.map(c => c == null ? "" : String(c))), fetchedAt: new Date().toISOString() };
  });
