import type { Metadata } from "next";
import React from "react";
import StatsOverview from "@/components/dashboard/StatsOverview";

export const metadata: Metadata = {
  title: "Dashboard ",
  description: "",
};

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">
          Overview
        </h1>
        <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
          Snapshot across users, requests and tracked market data.
        </p>
      </div>
      <StatsOverview />
    </div>
  );
}
