"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import StockSearchSelect from "./StockSearchSelect";
import StatementCard from "./StatementCard";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { FileIcon, BoxCubeIcon, DollarLineIcon } from "../../icons/index";
import {
  fetchAllStocks,
  fetchStatement,
  triggerFinancialsDump,
  triggerCashflowFetch,
  cleanStatementPeriods,
  StockListItem,
  StatementPeriod,
  PeriodType,
} from "@/lib/ielApi";

const STOCK_CACHE_KEY = "iel_all_stocks_cache_v1";
const STOCK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface StatementState {
  periods: StatementPeriod[];
  loading: boolean;
  error: string | null;
}

const initialStatementState: StatementState = { periods: [], loading: false, error: null };

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

export default function FinancialsExplorer() {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);

  const [symbol, setSymbol] = useState("");
  const [periodType, setPeriodType] = useState<PeriodType>("yearly");
  const [income, setIncome] = useState<StatementState>(initialStatementState);
  const [balance, setBalance] = useState<StatementState>(initialStatementState);
  const [cashflow, setCashflow] = useState<StatementState>(initialStatementState);

  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function loadStocks() {
      try {
        const cachedRaw = localStorage.getItem(STOCK_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            stocks: StockListItem[];
            cachedAt: number;
          };
          if (
            cached.stocks?.length &&
            Date.now() - cached.cachedAt < STOCK_CACHE_TTL_MS
          ) {
            setStocks(cached.stocks);
            setStocksLoading(false);
            return;
          }
        }
      } catch {
        // unreadable/unavailable cache — fall through to a live fetch
      }

      try {
        const res = await fetchAllStocks();
        const list = res.stocks || [];
        setStocks(list);
        try {
          localStorage.setItem(
            STOCK_CACHE_KEY,
            JSON.stringify({ stocks: list, cachedAt: Date.now() })
          );
        } catch {
          // storage unavailable — non-fatal, just skip caching
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load the stock list.");
      } finally {
        setStocksLoading(false);
      }
    }

    loadStocks();
  }, []);

  const loadStatements = useCallback(async (sym: string, period: PeriodType) => {
    setIncome({ periods: [], loading: true, error: null });
    setBalance({ periods: [], loading: true, error: null });
    setCashflow({ periods: [], loading: true, error: null });

    const [incomeRes, balanceRes, cashflowRes] = await Promise.allSettled([
      fetchStatement("income", sym, period),
      fetchStatement("balance", sym, period),
      fetchStatement("cashflow", sym, period),
    ]);

    if (incomeRes.status === "fulfilled") {
      setIncome({ periods: cleanStatementPeriods(incomeRes.value.data || []), loading: false, error: null });
    } else {
      setIncome({ periods: [], loading: false, error: "Failed to load the income statement." });
    }

    if (balanceRes.status === "fulfilled") {
      setBalance({ periods: cleanStatementPeriods(balanceRes.value.data || []), loading: false, error: null });
    } else {
      setBalance({ periods: [], loading: false, error: "Failed to load the balance sheet." });
    }

    if (cashflowRes.status === "fulfilled") {
      setCashflow({ periods: cleanStatementPeriods(cashflowRes.value.data || []), loading: false, error: null });
    } else {
      setCashflow({ periods: [], loading: false, error: "Failed to load the cash flow statement." });
    }
  }, []);

  useEffect(() => {
    if (symbol) {
      loadStatements(symbol, periodType);
    }
  }, [symbol, periodType, loadStatements]);

  const handleRefresh = async () => {
    if (!symbol) return;
    setRefreshing(true);

    try {
      const results = await Promise.allSettled([
        triggerFinancialsDump(symbol),
        triggerCashflowFetch(symbol),
      ]);

      const failure = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;

      if (failure) {
        const message =
          failure.reason instanceof Error ? failure.reason.message : "Vendor refresh failed.";
        toast.error(message);
      } else {
        toast.success(`Requested a fresh vendor pull for ${symbol}.`);
      }

      await loadStatements(symbol, periodType);
    } finally {
      setRefreshing(false);
      setConfirmRefresh(false);
    }
  };

  const selectedStock = stocks.find((s) => s.symbol === symbol) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">
          Financials Explorer
        </h1>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
          Check vendor data availability for any PSX-listed symbol.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <StockSearchSelect stocks={stocks} loading={stocksLoading} value={symbol} onSelect={setSymbol} />

        {selectedStock && (
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-50 px-2 py-1 text-[12.5px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {selectedStock.symbol}
            </span>
            <span className="max-w-[220px] truncate text-[12.5px] text-gray-500 dark:text-gray-400">
              {selectedStock.name}
            </span>
          </div>
        )}

        <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          {(["yearly", "quarterly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriodType(option)}
              className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium capitalize transition ${
                periodType === option
                  ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setConfirmRefresh(true)}
          disabled={!symbol || refreshing}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3.5 py-2 text-[13px] font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <RefreshIcon spinning={refreshing} />
          {refreshing ? "Refreshing…" : "Refresh from Vendor"}
        </button>
      </div>

      {!symbol ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            Search and select a stock above to view its financials.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <StatementCard
            title="Income Statement"
            icon={<FileIcon />}
            periods={income.periods}
            loading={income.loading}
            error={income.error}
            periodType={periodType}
          />
          <StatementCard
            title="Balance Sheet"
            icon={<BoxCubeIcon />}
            periods={balance.periods}
            loading={balance.loading}
            error={balance.error}
            periodType={periodType}
          />
          <StatementCard
            title="Cash Flow Statement"
            icon={<DollarLineIcon />}
            periods={cashflow.periods}
            loading={cashflow.loading}
            error={cashflow.error}
            periodType={periodType}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRefresh}
        title="Pull fresh data from the vendor?"
        description={
          symbol
            ? `This triggers a live pull of financial data for ${symbol} from the upstream data provider. It may take a few seconds and could be rate-limited or billed on the vendor's side.`
            : undefined
        }
        confirmLabel="Refresh from Vendor"
        variant="default"
        loading={refreshing}
        onCancel={() => setConfirmRefresh(false)}
        onConfirm={handleRefresh}
      />
    </div>
  );
}
