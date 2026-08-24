"use client"
import { useState } from "react";
import NotificationTable from "../../../components/tables/NotificationTable";
import { Metadata } from "next";
import React from "react";
import FormInModal from "../../../components/example/ModalExample/FormInModal";
export default function Notification() {
  const [refresh,setRefresh]=useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Notifications</h1>
        <FormInModal setValue={setRefresh}/>
      </div>
      <NotificationTable value={refresh}/>
    </div>
  );
}
