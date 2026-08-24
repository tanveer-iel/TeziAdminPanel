"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import IELTimingTable from "@/components/tables/IELTimingTable";



export default function IelTiming() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
           
        <ComponentCard title="IEL Timing">
          <IELTimingTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
