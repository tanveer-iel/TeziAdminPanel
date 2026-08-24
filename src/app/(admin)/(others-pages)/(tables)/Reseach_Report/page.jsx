"use client"
import { useState } from "react";
import ResearchReportTable from "@/components/tables/ResearchReportTable";
import ResearchModal from "@/components/example/ReseachModal";
import React from "react";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Research Report</h1>
        <ResearchModal setValue={setRefresh}/>
      </div>
      <ResearchReportTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
