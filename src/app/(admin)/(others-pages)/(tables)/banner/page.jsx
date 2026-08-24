"use client"
import { useState } from "react";
import BannerTable from "../../../../../components/tables/BannerTable"




export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Marketing Banner</h1>
      <BannerTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
