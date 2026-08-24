import ComponentCard from "../../../../../components/common/ComponentCard";
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
    <div>
      <div className="space-y-6">
        <ComponentCard title="Contact Us">
          <ContactTable />
        </ComponentCard>
      </div>
    </div>
  );
}
