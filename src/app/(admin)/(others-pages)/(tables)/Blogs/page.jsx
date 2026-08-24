"use client"
import { useState } from "react";

import BlogsTable from "../../../../../components/tables/BlogsTable";
import BlogsModal from "../../../../../components/example/BlogsModal";
import React from "react";



export default function BasicTables() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Blogs</h1>
        <BlogsModal setValue={setRefresh}/>
      </div>
      <BlogsTable value={refresh} setValue={setRefresh}/>
    </div>
  );
}
