"use client"
import { useState } from "react";
import RaastIdTable from "../../../../../components/tables/RaastIdTable"
import RaastIdModal from "../../../../../components/example/RaastIdModal"

export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Raast IDs</h1>
        <RaastIdModal setValue={setRefresh}/>
      </div>
      <RaastIdTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
