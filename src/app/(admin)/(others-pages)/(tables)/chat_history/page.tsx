import ChatTable from "../../../../..//components/tables/ChatTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AI Chat History",
  description:
    "AI Chat History Table",
};

export default function BasicTables() {
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">AI Chat History</h1>
      <ChatTable />
    </div>
  );
}
