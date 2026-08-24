"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import ResearchReportTable from "@/components/tables/ResearchReportTable";
import IELReseaerchReportTable from "@/components/tables/IELResearchReportTable";
import ResearchModal from "@/components/example/ReseachModal";
import IELResearchModal from "@/components/example/IELResearchModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <FinancialStatementModal setValue={setRefresh}/> */}
        <IELResearchModal setValue={setRefresh}/>
        <ComponentCard title="Research Report">
          <IELReseaerchReportTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
