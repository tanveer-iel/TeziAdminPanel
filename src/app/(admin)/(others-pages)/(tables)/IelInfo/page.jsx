"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import IELInfoTable from "@/components/tables/IELInfoTable";



export default function IelInfo() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
           
        <ComponentCard title="IEL Info">
          <IELInfoTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
