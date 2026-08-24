"use client"
import { useState } from "react";
import FinancialStatementTable from "../../../../../components/tables/FinancialsStatementTable";
import FinancialStatementModal from "../../../../../components/example/FinanicialStatementModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Finanicial Statement</h1>
        <FinancialStatementModal setValue={setRefresh}/>
      </div>
      <FinancialStatementTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
