"use client";

import React, { useCallback, useState } from "react";
import FinancialStatementTable from "@/components/tables/FinancialsStatementTable";
import FinancialStatementModal from "@/components/example/FinanicialStatementModal";

export default function FinancialStatementsPage() {
  // Bumping this number makes the table reload. (A true/false flag set to
  // `true` twice in a row would not trigger a second reload.)
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">
          Financial Statements
        </h1>
        <FinancialStatementModal onSaved={reload} />
      </div>
      <FinancialStatementTable refreshKey={refreshKey} onChanged={reload} />
    </div>
  );
}
