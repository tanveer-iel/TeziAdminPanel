import ComponentCard from "../../../../../components/common/ComponentCard";
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
    <div>
      <div className="space-y-6">
        <ComponentCard title="Users">
          <BasicTableOne />
        </ComponentCard>
      </div>
    </div>
  );
}
