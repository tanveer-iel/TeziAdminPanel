"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard"
import BannerTable from "../../../../../components/tables/BannerTable"




export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
        <ComponentCard title="Marketing Banner">
          <BannerTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
