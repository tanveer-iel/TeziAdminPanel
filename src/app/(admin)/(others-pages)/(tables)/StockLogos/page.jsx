"use client"
import { useState } from "react";
import StockLogosTable from "@/components/tables/StockLogosTable";
import StockLogoModal from "@/components/example/StockLogoModal";
import React from "react";



export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Stock Logos</h1>
        <StockLogoModal setValue={setRefresh}/>
      </div>
      <StockLogosTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
