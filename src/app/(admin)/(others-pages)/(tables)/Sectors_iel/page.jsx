"use client"
import { useState } from "react";
import IELSectorModal from "@/components/example/IELSectorModal"
import IELSectorTable from "@/components/tables/IELSectorTable";

export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Sectors (IEL)</h1>
        <IELSectorModal setValue={setRefresh}/>
      </div>
      <IELSectorTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
