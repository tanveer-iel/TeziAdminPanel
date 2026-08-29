export interface StockListItem {
  symbol: string;
  name: string;
}

export interface AllStocksResponse {
  stocks: StockListItem[];
  total_stocks: number;
  timestamp: string;
}

export interface LineItem {
  key: string | null;
  unit: string | null;
  label: string;
  value: number | null;
  is_heading: boolean;
  description: string | null;
}

export interface StatementPeriod {
  symbol: string;
  period: string | Record<string, unknown>;
  period_type: string;
  line_items: LineItem[];
  updated_at: string;
}

export interface StatementResponse {
  symbol: string;
  data: StatementPeriod[];
  total_records: number;
}

export type StatementKind = "income" | "balance" | "cashflow";

const PROXY_BASE = "/api/iel";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function fetchAllStocks() {
  return getJson<AllStocksResponse>("/search/all-stocks");
}

export function fetchStatement(statement: StatementKind, symbol: string) {
  return getJson<StatementResponse>(
    `/financials/${statement}?symbol=${encodeURIComponent(symbol)}&period_type=yearly`
  );
}

export function triggerFinancialsDump(symbol: string) {
  return postJson("/financials/dump", { symbol });
}

export function triggerCashflowFetch(symbol: string) {
  return postJson("/financials/cashflow/fetch", { symbol });
}

/**
 * The vendor's income/balance datasets carry duplicate records per period in
 * two shapes: one with `period` as a plain year string and populated
 * `line_items`, and a mirror record with `period` as a nested object and an
 * always-empty `line_items`. Keep only the populated, plain-string ones.
 */
export function cleanStatementPeriods(periods: StatementPeriod[]): StatementPeriod[] {
  return periods.filter(
    (p) =>
      typeof p.period === "string" &&
      Array.isArray(p.line_items) &&
      p.line_items.length > 0
  );
}
