"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { StockListItem } from "@/lib/ielApi";

interface StockSearchSelectProps {
  stocks: StockListItem[];
  loading: boolean;
  value: string;
  onSelect: (symbol: string) => void;
}

const MAX_RESULTS = 40;

export default function StockSearchSelect({
  stocks,
  loading,
  value,
  onSelect,
}: StockSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => stocks.find((s) => s.symbol === value) ?? null,
    [stocks, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks.slice(0, MAX_RESULTS);
    return stocks
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [stocks, query]);

  const displayValue = open ? query : selected ? `${selected.symbol} — ${selected.name}` : query;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={loading ? "Loading stock list…" : "Search by symbol or company name…"}
          disabled={loading}
          className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-8 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-white/[0.02]"
        />
        {selected && !open && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => {
              onSelect("");
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {open && !loading && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-white/[0.05] dark:bg-gray-900">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-gray-500 dark:text-gray-400">
              No matching stocks.
            </div>
          ) : (
            results.map((s) => (
              <button
                key={s.symbol}
                type="button"
                onClick={() => {
                  onSelect(s.symbol);
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                  s.symbol === value ? "bg-brand-50 dark:bg-brand-500/10" : ""
                }`}
              >
                <span className="w-16 flex-shrink-0 font-semibold text-gray-800 dark:text-white/90">
                  {s.symbol}
                </span>
                <span className="truncate text-gray-500 dark:text-gray-400">{s.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
