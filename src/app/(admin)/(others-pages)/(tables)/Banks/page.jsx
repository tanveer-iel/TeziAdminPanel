"use client"
import { useState } from "react";
import BankModal from "@/components/example/BanksModal"
import BanksTable from "@/components/tables/BanksTable";

export default function BasicTables() {
  const [refresh, setRefresh] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Banks</h1>
        <BankModal setValue={setRefresh} />
      </div>
      <BanksTable value={refresh} setValue={setRefresh} />
    </div>
  );
}
