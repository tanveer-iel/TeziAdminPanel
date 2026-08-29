"use client";

import React from "react";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import type { StatementPeriod } from "@/lib/ielApi";

interface StatementCardProps {
  title: string;
  icon: React.ReactNode;
  periods: StatementPeriod[];
  loading: boolean;
  error: string | null;
  periodType: "yearly" | "quarterly";
}

interface MatrixRow {
  key: string;
  label: string;
  isHeading: boolean;
  values: (number | null | undefined)[];
}

function buildMatrix(periods: StatementPeriod[]): { columns: string[]; rows: MatrixRow[] } {
  const columns = periods.map((p) => (typeof p.period === "string" ? p.period : String(p.period)));
  const rowOrder: string[] = [];
  const rowMeta: Record<string, { label: string; isHeading: boolean }> = {};
  const valueMap: Record<string, (number | null | undefined)[]> = {};

  periods.forEach((period, colIndex) => {
    period.line_items.forEach((item) => {
      const rowKey = item.key ?? `label:${item.label}`;
      if (!rowMeta[rowKey]) {
        rowMeta[rowKey] = { label: item.label, isHeading: item.is_heading };
        rowOrder.push(rowKey);
        valueMap[rowKey] = new Array(periods.length).fill(undefined);
      }
      valueMap[rowKey][colIndex] = item.value;
    });
  });

  return {
    columns,
    rows: rowOrder.map((rowKey) => ({
      key: rowKey,
      label: rowMeta[rowKey].label,
      isHeading: rowMeta[rowKey].isHeading,
      values: valueMap[rowKey],
    })),
  };
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function EmptyState({ title, periodType }: { title: string; periodType: "yearly" | "quarterly" }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      </span>
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
        Not available from the vendor yet
      </p>
      <p className="max-w-xs text-[12.5px] text-gray-500 dark:text-gray-400">
        The data provider hasn&apos;t supplied {periodType} {title.toLowerCase()} figures for this
        symbol{periodType === "quarterly" ? " — this vendor may only report yearly data" : ""}. Try
        &quot;Refresh from Vendor&quot;, or check back later.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <p className="text-[13px] text-error-500">{message}</p>
    </div>
  );
}

function MatrixTable({ periods }: { periods: StatementPeriod[] }) {
  const { columns, rows } = buildMatrix(periods);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <tr>
            <th className="px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Line item
            </th>
            {columns.map((col, i) => (
              <th
                key={`${col}-${i}`}
                className="px-4 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-gray-100 last:border-0 dark:border-white/[0.04] ${
                row.isHeading
                  ? "bg-gray-50/60 dark:bg-white/[0.02]"
                  : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
              }`}
            >
              <td
                className={`px-4 py-2 text-[12.5px] ${
                  row.isHeading
                    ? "font-semibold text-gray-800 dark:text-white/90"
                    : "pl-6 text-gray-600 dark:text-gray-400"
                }`}
              >
                {row.label}
              </td>
              {row.values.map((value, i) => (
                <td key={i} className="px-4 py-2 text-end text-[12.5px] text-gray-700 dark:text-gray-300">
                  {row.isHeading ? "" : formatValue(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatementCard({ title, icon, periods, loading, error, periodType }: StatementCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-white/[0.05]">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <h3 className="text-[13.5px] font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : error ? (
        <ErrorState message={error} />
      ) : periods.length === 0 ? (
        <EmptyState title={title} periodType={periodType} />
      ) : (
        <MatrixTable periods={periods} />
      )}
    </div>
  );
}
