"use client"
import { useState } from "react";
import SymbolReseaerchReportTable from "@/components/tables/SymbolResearchReportTable";
import SymbolResearchModal from "@/components/example/SymbolResearchModal";
import React from "react";

export default function BasicTables() {
  const [refresh, setRefresh] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Symbol Research Report</h1>
        <SymbolResearchModal setValue={setRefresh}/>
      </div>
      <SymbolReseaerchReportTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
