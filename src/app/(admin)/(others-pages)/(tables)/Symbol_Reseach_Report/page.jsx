"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import FinancialStatementModal from "../../../../../components/example/FinanicialStatementModal";
import SymbolReseaerchReportTable from "@/components/tables/SymbolResearchReportTable";
import SymbolResearchModal from "@/components/example/SymbolResearchModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <FinancialStatementModal setValue={setRefresh}/> */}
        <SymbolResearchModal setValue={setRefresh}/>
        <ComponentCard title="Symbol Research Report">
          <SymbolReseaerchReportTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
