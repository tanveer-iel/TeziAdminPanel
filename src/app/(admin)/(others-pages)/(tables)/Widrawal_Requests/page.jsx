"use client"
import { useState } from "react";
import WindrawTable from "@/components/tables/WidrawTable";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Widrawal Requests</h1>
      <WindrawTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
