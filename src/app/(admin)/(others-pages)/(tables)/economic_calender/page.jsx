"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import EconomicTable from "../../../../../components/tables/EconomicsTable";
import EconomicModal from "../../../../..//components/example/EconmicCalenderModal";

import React from "react";



export default function EconomicCalender() {
    const [refresh,setRefresh]=useState(false)

  return (
    <div>
     
      <div className="space-y-6">
         <EconomicModal setValue={setRefresh}/>
        <ComponentCard title="Economic Calender">
          <EconomicTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
