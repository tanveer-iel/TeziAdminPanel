"use client"
import { useState } from "react";

import ComponentCard from "../../../../../components/common/ComponentCard"

// import BlogsTable from "../../../../../components/tables/BlogsTable";
import RaastIdTable from "../../../../../components/tables/RaastIdTable"
// import BlogsModal from "../../../../../components/example/BlogsModal";
import RaastIdModal from "../../../../../components/example/RaastIdModal"
import React from "react";



export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         <RaastIdModal setValue={setRefresh}/>
        <ComponentCard title="Raast IDs">
          <RaastIdTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
