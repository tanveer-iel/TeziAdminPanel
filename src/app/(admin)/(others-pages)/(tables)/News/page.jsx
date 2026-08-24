"use client"
import { useState } from "react";

import NewsTable from "../../../../../components/tables/NewsTable";
import React from "react";
import NewsModal from "../../../../../components/example/NewsModal";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">News</h1>
        <NewsModal setValue={setRefresh}/>
      </div>
      <NewsTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
