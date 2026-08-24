"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import WindrawTable from "@/components/tables/WidrawTable";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">

        <ComponentCard title="Widrawal Requests">
          <WindrawTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
