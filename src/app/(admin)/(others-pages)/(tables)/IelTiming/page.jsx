"use client"
import { useState } from "react";
import IELTimingTable from "@/components/tables/IELTimingTable";

export default function IelTiming() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">IEL Timing</h1>
      </div>
      <IELTimingTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
