import { createServerFn } from "@tanstack/react-start";
import type { SheetMeta, SourceType } from "@/features/reimb/types";

const GOOGLE_GW = "https://connector-gateway.lovable.dev/google_sheets/v4";
const EXCEL_GW = "https://connector-gateway.lovable.dev/microsoft_excel";

function googleHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) throw new Error("Google Sheets não configurado nesta conta");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn } as Record<string, string>;
}
function excelHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.MICROSOFT_EXCEL_API_KEY;
  if (!lovable || !conn) throw new Error("Microsoft Excel não configurado nesta conta");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn } as Record<string, string>;
}

export function detectSource(url: string): SourceType {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/spreadsheets")) return "google";
  if (u.includes("sharepoint.com") || u.includes("onedrive.live.com") || u.includes("1drv.ms") || u.includes("office.com") || u.includes(".xlsx")) return "excel";
  throw new Error("Link não reconhecido. Use Google Sheets ou Excel Online (SharePoint/OneDrive).");
}

function parseGoogleId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input)) return input;
  throw new Error("URL ou ID Google Sheets inválido");
}

function encodeShareUrl(url: string): string {
  // Microsoft Graph: u! + base64url(url) (no padding)
  const b64 = Buffer.from(url, "utf8").toString("base64").replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  return "u!" + b64;
}

/* ---------------- Google ---------------- */
async function googleMeta(url: string): Promise<SheetMeta> {
  const id = parseGoogleId(url);
  const headers = googleHeaders();
  const metaRes = await fetch(`${GOOGLE_GW}/spreadsheets/${id}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`, { headers });
  if (!metaRes.ok) throw new Error(`Google Sheets (${metaRes.status}): ${await metaRes.text()}`);
  const meta = await metaRes.json() as { properties?: { title?: string }; sheets: Array<{ properties: { sheetId: number; title: string } }> };
  const sheetTitles = meta.sheets.map(s => s.properties.title);
  const ranges = sheetTitles.map(t => `ranges=${encodeURIComponent(`'${t}'!1:1`)}`).join("&");
  const headersRes = await fetch(`${GOOGLE_GW}/spreadsheets/${id}/values:batchGet?${ranges}`, { headers });
  if (!headersRes.ok) throw new Error(`Google headers (${headersRes.status}): ${await headersRes.text()}`);
  const headersJson = await headersRes.json() as { valueRanges?: Array<{ range?: string; values?: unknown[][] }> };
  const headersByTitle: Record<string, string[]> = {};
  (headersJson.valueRanges ?? []).forEach(vr => {
    const title = (vr.range ?? "").split("!")[0].replace(/^'|'$/g, "");
    headersByTitle[title] = (vr.values?.[0] ?? []).map(h => String(h ?? ""));
  });
  return {
    sourceType: "google",
    spreadsheetId: id,
    title: meta.properties?.title ?? id,
    sheets: meta.sheets.map(s => ({
      id: s.properties.sheetId,
      title: s.properties.title,
      headers: headersByTitle[s.properties.title] ?? [],
    })),
  };
}

async function googleRows(spreadsheetId: string, sheet: string): Promise<string[][]> {
  const range = `'${sheet}'!A1:Z10000`;
  const res = await fetch(`${GOOGLE_GW}/spreadsheets/${spreadsheetId}/values/${range}`, { headers: googleHeaders() });
  if (!res.ok) throw new Error(`Google rows (${res.status}): ${await res.text()}`);
  const json = await res.json() as { values?: unknown[][] };
  return (json.values ?? []).map(r => r.map(c => (c == null ? "" : String(c))));
}

/* ---------------- Excel ---------------- */
async function excelMeta(url: string): Promise<SheetMeta> {
  const shareId = encodeShareUrl(url);
  const headers = excelHeaders();
  // Resolve drive item
  const itemRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem?$select=id,name,parentReference`, { headers });
  if (!itemRes.ok) throw new Error(`Excel item (${itemRes.status}): ${await itemRes.text()}`);
  const item = await itemRes.json() as { id: string; name: string; parentReference?: { driveId?: string } };
  // List worksheets
  const wsRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem/workbook/worksheets?$select=id,name`, { headers });
  if (!wsRes.ok) throw new Error(`Excel worksheets (${wsRes.status}): ${await wsRes.text()}`);
  const wsJson = await wsRes.json() as { value: Array<{ id: string; name: string }> };
  // Fetch first row of each worksheet (headers)
  const sheets = await Promise.all(wsJson.value.map(async ws => {
    const escName = ws.name.replace(/'/g, "''");
    const rangeRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem/workbook/worksheets('${encodeURIComponent(escName)}')/range(address='A1:Z1')?$select=values`, { headers });
    let headerRow: string[] = [];
    if (rangeRes.ok) {
      const j = await rangeRes.json() as { values?: unknown[][] };
      headerRow = (j.values?.[0] ?? []).map(v => String(v ?? "")).filter(h => h !== "");
    }
    return { id: ws.id, title: ws.name, headers: headerRow };
  }));
  return {
    sourceType: "excel",
    spreadsheetId: item.id,
    title: item.name,
    sheets,
    excelDriveId: item.parentReference?.driveId,
    excelItemId: item.id,
  };
}

async function excelRows(url: string, sheet: string): Promise<string[][]> {
  const shareId = encodeShareUrl(url);
  const headers = excelHeaders();
  const escName = sheet.replace(/'/g, "''");
  // Get usedRange bounds first
  const boundsRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem/workbook/worksheets('${encodeURIComponent(escName)}')/usedRange(valuesOnly=true)?$select=address,rowCount,columnCount`, { headers });
  if (!boundsRes.ok) throw new Error(`Excel bounds (${boundsRes.status}): ${await boundsRes.text()}`);
  const bounds = await boundsRes.json() as { address?: string; rowCount?: number; columnCount?: number };
  const addr = bounds.address?.split("!")?.[1] ?? "A1:Z1000";
  const valRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem/workbook/worksheets('${encodeURIComponent(escName)}')/range(address='${addr}')?$select=values`, { headers });
  if (!valRes.ok) throw new Error(`Excel values (${valRes.status}): ${await valRes.text()}`);
  const j = await valRes.json() as { values?: unknown[][] };
  return (j.values ?? []).map(r => r.map(c => (c == null ? "" : String(c))));
}

/* ---------------- Public API ---------------- */
export const getSpreadsheetMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<SheetMeta> => {
    const src = detectSource(data.url);
    return src === "google" ? googleMeta(data.url) : excelMeta(data.url);
  });

export type RawSheetData = { headers: string[]; rows: string[][]; fetchedAt: string };

export async function fetchSheetData(sourceType: SourceType, url: string, spreadsheetId: string, sheet: string): Promise<RawSheetData> {
  const values = sourceType === "google" ? await googleRows(spreadsheetId, sheet) : await excelRows(url, sheet);
  const [headers = [], ...rows] = values;
  return { headers: headers.map(String), rows, fetchedAt: new Date().toISOString() };
}
