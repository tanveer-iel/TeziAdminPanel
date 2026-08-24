"use client"
import { useState } from "react";
import ComponentCard from "../../../../../components/common/ComponentCard"
import StockLogosTable from "@/components/tables/StockLogosTable";
import BlogsModal from "../../../../../components/example/BlogsModal";
import StockLogoModal from "@/components/example/StockLogoModal";
import React from "react";



export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         {/* <BlogsModal setValue={setRefresh}/> */}
         <StockLogoModal setValue={setRefresh}/>
        <ComponentCard title="Stock Logos">
          <StockLogosTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
