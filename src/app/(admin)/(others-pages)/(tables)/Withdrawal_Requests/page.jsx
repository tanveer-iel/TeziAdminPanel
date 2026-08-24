"use client"
import { useState } from "react";
import WithdrawalRequestsTable from "@/components/tables/WithdrawalRequestsTable";

export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Withdrawal Requests</h1>
      <WithdrawalRequestsTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
