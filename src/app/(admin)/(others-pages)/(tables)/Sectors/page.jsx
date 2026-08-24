"use client"
import { useState } from "react";
import SectorTable from "@/components/tables/SectorsTable";
import SectorModal from "@/components/example/SectorModal";

export default function BasicTables() {
  const [refresh, setRefresh] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Sectors</h1>
        <SectorModal setValue={setRefresh}/>
      </div>
      <SectorTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
