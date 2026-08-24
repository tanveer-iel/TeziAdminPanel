"use client"
import { useState } from "react";
import EconomicTable from "../../../../../components/tables/EconomicsTable";
import EconomicModal from "../../../../..//components/example/EconmicCalenderModal";

import React from "react";



export default function EconomicCalender() {
    const [refresh,setRefresh]=useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Economic Calender</h1>
        <EconomicModal setValue={setRefresh}/>
      </div>
      <EconomicTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
