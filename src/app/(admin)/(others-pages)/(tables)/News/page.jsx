"use client"
import { useState } from "react";

import ComponentCard from "../../../../../components/common/ComponentCard";
import NewsTable from "../../../../../components/tables/NewsTable";
import React from "react";
import NewsModal from "../../../../../components/example/NewsModal";



export default function BasicTables() {
   const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         <NewsModal setValue={setRefresh}/>
        <ComponentCard title="News">
          <NewsTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
