"use client"
import { useState } from "react";
// import ComponentCard from "@/components/common/ComponentCard";
import ComponentCard from "../../../components/common/ComponentCard"
import NotificationTable from "../../../components/tables/NotificationTable";
import { Metadata } from "next";
import React from "react";
import FormInModal from "../../../components/example/ModalExample/FormInModal";
export default function Notification() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div>
      <div className="space-y-6">
       <FormInModal setValue={setRefresh}/>
    
        <ComponentCard title="Notifications">
          <NotificationTable value={refresh}/>
        </ComponentCard>
      </div>
    </div>
  );
}