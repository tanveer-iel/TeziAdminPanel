"use client"
import { useState } from "react";

import ComponentCard from "../../../../../components/common/ComponentCard"

import BlogsTable from "../../../../../components/tables/BlogsTable";
import BlogsModal from "../../../../../components/example/BlogsModal";
import React from "react";



export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
         <BlogsModal setValue={setRefresh}/>
        <ComponentCard title="Blogs">
          <BlogsTable value={refresh} setValue={setRefresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}
