"use client"
import { useState } from "react";
import IELReseaerchReportTable from "@/components/tables/IELResearchReportTable";
import IELResearchModal from "@/components/example/IELResearchModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Research Report (IEL)</h1>
        <IELResearchModal setValue={setRefresh}/>
      </div>
      <IELReseaerchReportTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
