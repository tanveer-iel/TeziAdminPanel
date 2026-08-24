"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import FinancialStatementModal from "../../../../../components/example/FinanicialStatementModal";
import ResearchReportTable from "@/components/tables/ResearchReportTable";
import ResearchModal from "@/components/example/ReseachModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <FinancialStatementModal setValue={setRefresh}/> */}
        <ResearchModal setValue={setRefresh}/>
        <ComponentCard title="Research Report">
          <ResearchReportTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
