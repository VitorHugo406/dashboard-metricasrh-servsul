import { createServerFn } from "@tanstack/react-start";
import type { SheetMeta, SourceType } from "@/features/reimb/types";

const GOOGLE_GW = "https://connector-gateway.lovable.dev/google_sheets/v4";
const EXCEL_GW = "https://connector-gateway.lovable.dev/microsoft_excel";

function googleHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !conn) throw new Error("Google Sheets não configurado nesta conta");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn } as Record<
    string,
    string
  >;
}
function tryExcelHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.MICROSOFT_EXCEL_API_KEY;
  if (!lovable || !conn) return null;
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn } as Record<
    string,
    string
  >;
}

export function detectSource(url: string): SourceType {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/spreadsheets")) return "google";
  if (
    u.includes("sharepoint.com") ||
    u.includes("onedrive.live.com") ||
    u.includes("1drv.ms") ||
    u.includes("office.com") ||
    u.includes(".xlsx")
  )
    return "excel";
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
  const b64 = Buffer.from(url, "utf8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\//g, "_")
    .replace(/\+/g, "-");
  return "u!" + b64;
}

const PUBLIC_EXCEL_HOSTS = [
  "1drv.ms",
  "onedrive.live.com",
  "office.com",
  "www.office.com",
  "sharepoint.com",
  "microsoftpersonalcontent.com",
];

function assertAllowedExcelUrl(input: string): URL {
  const parsed = new URL(input);
  if (parsed.protocol !== "https:") throw new Error("O link do Excel precisa usar HTTPS.");
  const host = parsed.hostname.toLowerCase();
  const allowed = PUBLIC_EXCEL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) throw new Error("Domínio do link Excel não permitido.");
  return parsed;
}

async function fetchAllowedExcelUrl(input: string, init?: RequestInit, redirects = 0): Promise<Response> {
  const url = assertAllowedExcelUrl(input);
  const requestHeaders = new Headers(init?.headers);
  if (!requestHeaders.has("user-agent"))
    requestHeaders.set(
      "user-agent",
      "Mozilla/5.0 (compatible; ReembolsosDashboard/1.0; +https://lovable.app)",
    );
  if (!requestHeaders.has("accept"))
    requestHeaders.set("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  const res = await fetch(url.toString(), {
    ...init,
    redirect: "manual",
    headers: requestHeaders,
  });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    if (redirects >= 6) throw new Error("Redirecionamentos demais ao abrir o link do Excel.");
    const location = res.headers.get("location");
    if (!location) return res;
    const next = new URL(location, url).toString();
    return fetchAllowedExcelUrl(next, init, redirects + 1);
  }
  return res;
}

function extractWopiContext(html: string): { FileName?: string; FileGetUrl?: string } | null {
  const match = html.match(/_wopiContextJson\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as { FileName?: string; FileGetUrl?: string };
  } catch {
    return null;
  }
}

/* ---------------- Google ---------------- */
async function googleMeta(url: string): Promise<SheetMeta> {
  const id = parseGoogleId(url);
  const headers = googleHeaders();
  const metaRes = await fetch(
    `${GOOGLE_GW}/spreadsheets/${id}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
    { headers },
  );
  if (!metaRes.ok) throw new Error(`Google Sheets (${metaRes.status}): ${await metaRes.text()}`);
  const meta = (await metaRes.json()) as {
    properties?: { title?: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };
  const sheetTitles = meta.sheets.map((s) => s.properties.title);
  const ranges = sheetTitles.map((t) => `ranges=${encodeURIComponent(`'${t}'!1:1`)}`).join("&");
  const headersRes = await fetch(`${GOOGLE_GW}/spreadsheets/${id}/values:batchGet?${ranges}`, {
    headers,
  });
  if (!headersRes.ok)
    throw new Error(`Google headers (${headersRes.status}): ${await headersRes.text()}`);
  const headersJson = (await headersRes.json()) as {
    valueRanges?: Array<{ range?: string; values?: unknown[][] }>;
  };
  const headersByTitle: Record<string, string[]> = {};
  (headersJson.valueRanges ?? []).forEach((vr) => {
    const title = (vr.range ?? "").split("!")[0].replace(/^'|'$/g, "");
    headersByTitle[title] = (vr.values?.[0] ?? []).map((h) => String(h ?? ""));
  });
  return {
    sourceType: "google",
    spreadsheetId: id,
    title: meta.properties?.title ?? id,
    sheets: meta.sheets.map((s) => ({
      id: s.properties.sheetId,
      title: s.properties.title,
      headers: headersByTitle[s.properties.title] ?? [],
    })),
  };
}

async function googleRows(spreadsheetId: string, sheet: string): Promise<string[][]> {
  const range = `'${sheet}'!A1:Z10000`;
  const res = await fetch(`${GOOGLE_GW}/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: googleHeaders(),
  });
  if (!res.ok) throw new Error(`Google rows (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { values?: unknown[][] };
  return (json.values ?? []).map((r) => r.map((c) => (c == null ? "" : String(c))));
}

/* ---------------- Excel ---------------- */
// Personal Microsoft (MSA) accounts return:
//   "This API is not supported for MSA accounts (no addressUrl for Microsoft.Excel,False)"
// for the workbook/worksheets endpoint. We sidestep the workbook API entirely and
// download the .xlsx file, then parse with the `xlsx` library — works for OneDrive
// Personal, OneDrive for Business, and SharePoint shared links alike.

type WorkbookCache = { name: string; sheets: Record<string, string[][]>; fetchedAt: number };
const _wbCache = new Map<string, WorkbookCache>();
const WB_TTL_MS = 60_000; // dedupe within 1 min for meta+rows on the same URL

function columnLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function makeUniqueHeaders(row: string[]): string[] {
  const seen = new Map<string, number>();
  return row.map((cell, index) => {
    const base = String(cell ?? "").trim() || `Coluna ${columnLabel(index)}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base} (${count + 1})` : base;
  });
}

function findHeaderRow(rows: string[][]): { rowIndex: number; headers: string[] } {
  const limit = Math.min(rows.length, 25);
  let best = { rowIndex: 0, score: -1, nonEmpty: 0 };
  for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const cells = row.map((c) => String(c ?? "").trim());
    const nonEmpty = cells.filter(Boolean).length;
    if (!nonEmpty) continue;
    const textLike = cells.filter((c) => /[A-Za-zÀ-ÿ]/.test(c)).length;
    const known = cells.filter((c) =>
      /(data|date|valor|total|depart|setor|área|colab|funcion|nome|status|situa|categ|benef|tipo|cliente|client|descri|observ)/i.test(
        c,
      ),
    ).length;
    const score = nonEmpty * 2 + textLike + known * 4 - rowIndex * 0.2;
    if (score > best.score) best = { rowIndex, score, nonEmpty };
  }
  const raw = rows[best.rowIndex] ?? [];
  return { rowIndex: best.rowIndex, headers: makeUniqueHeaders(raw) };
}

async function downloadAndParseExcel(url: string): Promise<WorkbookCache> {
  const cached = _wbCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < WB_TTL_MS) return cached;
  assertAllowedExcelUrl(url);
  const shareId = encodeShareUrl(url);
  const headers = tryExcelHeaders();
  let name = "workbook";
  if (headers) {
    try {
      const itemRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem?$select=id,name`, {
        headers,
      });
      if (itemRes.ok) {
        const j = (await itemRes.json()) as { name?: string };
        name = j.name ?? name;
      }
    } catch {
      /* non-fatal */
    }
  }
  let buf: Uint8Array | null = null;
  let gatewayError = "Microsoft Excel não autorizou o download pela conexão atual.";
  if (headers) {
    const dlRes = await fetch(`${EXCEL_GW}/shares/${shareId}/driveItem/content`, {
      headers,
      redirect: "follow",
    });
    if (dlRes.ok) {
      buf = new Uint8Array(await dlRes.arrayBuffer());
    } else {
      gatewayError = await dlRes.text();
    }
  }
  if (!buf) {
    const publicRes = await fetchAllowedExcelUrl(url);
    const contentType = publicRes.headers.get("content-type") ?? "";
    if (!publicRes.ok) throw new Error(`Excel download (${publicRes.status}): ${gatewayError}`);
    if (!contentType.includes("text/html")) {
      buf = new Uint8Array(await publicRes.arrayBuffer());
    } else {
      const html = await publicRes.text();
      const wopi = extractWopiContext(html);
      if (!wopi?.FileGetUrl) throw new Error(`Excel download: ${gatewayError}`);
      if (wopi.FileName) name = wopi.FileName;
      const fileRes = await fetchAllowedExcelUrl(wopi.FileGetUrl, {
        headers: { accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*" },
      });
      if (!fileRes.ok) throw new Error(`Excel download (${fileRes.status}): ${await fileRes.text()}`);
      buf = new Uint8Array(await fileRes.arrayBuffer());
    }
  }
  if (!buf || buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error("O arquivo baixado não parece ser uma planilha .xlsx válida.");
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const sheets: Record<string, string[][]> = {};
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
    sheets[sheetName] = rows.map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c))));
  }
  const entry: WorkbookCache = { name, sheets, fetchedAt: Date.now() };
  _wbCache.set(url, entry);
  return entry;
}

async function excelMeta(url: string): Promise<SheetMeta> {
  const { name, sheets } = await downloadAndParseExcel(url);
  const sheetMetas = Object.entries(sheets).map(([title, rows], idx) => ({
    id: idx,
    title,
    headers: findHeaderRow(rows).headers,
  }));
  return { sourceType: "excel", spreadsheetId: url, title: name, sheets: sheetMetas };
}

async function excelRows(url: string, sheet: string): Promise<string[][]> {
  const { sheets } = await downloadAndParseExcel(url);
  const rows = sheets[sheet];
  if (!rows) throw new Error(`Aba "${sheet}" não encontrada no Excel.`);
  const { rowIndex, headers } = findHeaderRow(rows);
  return [headers, ...rows.slice(rowIndex + 1)];
}

export async function getSpreadsheetMetaData(url: string): Promise<SheetMeta> {
  const src = detectSource(url);
  return src === "google" ? googleMeta(url) : excelMeta(url);
}

/* ---------------- Public API ---------------- */
export const getSpreadsheetMeta = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<SheetMeta> => {
    return getSpreadsheetMetaData(data.url);
  });

export type RawSheetData = { headers: string[]; rows: string[][]; fetchedAt: string };

export async function fetchSheetData(
  sourceType: SourceType,
  url: string,
  spreadsheetId: string,
  sheet: string,
): Promise<RawSheetData> {
  const values =
    sourceType === "google" ? await googleRows(spreadsheetId, sheet) : await excelRows(url, sheet);
  const [headers = [], ...rows] = values;
  return {
    headers: makeUniqueHeaders(headers.map(String)),
    rows,
    fetchedAt: new Date().toISOString(),
  };
}
