import BasicTableOne from "../../../../..//components/tables/BasicTableOne";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Users",
  description:
    "User Table",
};

export default function BasicTables() {
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Users</h1>
      <BasicTableOne />
    </div>
  );
}
