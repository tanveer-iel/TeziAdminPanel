"use client"
import { useState } from "react";
import IELInfoTable from "@/components/tables/IELInfoTable";

export default function IelInfo() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">IEL Info</h1>
      </div>
      <IELInfoTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
