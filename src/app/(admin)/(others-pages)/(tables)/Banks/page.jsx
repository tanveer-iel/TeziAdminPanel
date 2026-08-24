"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard";
import SectorTable from "@/components/tables/SectorsTable";
import SectorModal from "@/components/example/SectorModal";
import FinancialStatementModal from "../../../../../components/example/FinanicialStatementModal";
import BankModal from "@/components/example/BanksModal"
import BanksTable from "@/components/tables/BanksTable";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <FinancialStatementModal setValue={setRefresh}/> */}
         <BankModal setValue={setRefresh}/>   
        <ComponentCard title="Banks">
          <BanksTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
