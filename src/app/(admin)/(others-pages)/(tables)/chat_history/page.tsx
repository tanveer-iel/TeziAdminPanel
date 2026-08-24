import ComponentCard from "../../../../../components/common/ComponentCard";
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
    <div>
      <div className="space-y-6">
        <ComponentCard title="AI Chat History">
          <ChatTable />
        </ComponentCard>
      </div>
    </div>
  );
}
