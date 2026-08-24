"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import SectorTable from "@/components/tables/SectorsTable";
import SectorModal from "@/components/example/SectorModal";
import IELSectorModal from "@/components/example/IELSectorModal"
import IELSectorTable from "@/components/tables/IELSectorTable";
import FinancialStatementModal from "../../../../../components/example/FinanicialStatementModal";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <FinancialStatementModal setValue={setRefresh}/> */}
         <IELSectorModal setValue={setRefresh}/>   
        <ComponentCard title="Sectors">
          <IELSectorTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
