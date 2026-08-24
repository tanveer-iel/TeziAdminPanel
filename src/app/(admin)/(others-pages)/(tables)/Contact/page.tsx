import ContactTable from "../../../../../components/tables/ContactTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Us Table",
};

export default function BasicTables() {
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">Contact Us</h1>
      <ContactTable />
    </div>
  );
}
