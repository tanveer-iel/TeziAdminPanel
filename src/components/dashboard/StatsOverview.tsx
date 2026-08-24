"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "../../../SupabaseConfig";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";

interface StatDef {
  label: string;
  href: string;
  query: () => Promise<number | null>;
}

const countTable = async (table: string): Promise<number | null> => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`Failed to count ${table}:`, error);
    return null;
  }
  return count ?? 0;
};

const countPendingWithdrawals = async (): Promise<number | null> => {
  const { count, error } = await supabase
    .from("widrawrequest")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    console.error("Failed to count pending withdrawals:", error);
    return null;
  }
  return count ?? 0;
};

const statDefs: StatDef[] = [
  {
    label: "Total Users",
    href: "/Users",
    query: () => countTable("profiles"),
  },
  {
    label: "Pending Withdrawals",
    href: "/Widrawal_Requests",
    query: countPendingWithdrawals,
  },
  {
    label: "Banks Tracked",
    href: "/Banks",
    query: () => countTable("bank_list"),
  },
  {
    label: "Sectors Tracked",
    href: "/Sectors",
    query: () => countTable("sector"),
  },
  {
    label: "Raast IDs",
    href: "/RaastIds",
    query: () => countTable("raastids"),
  },
  {
    label: "Contact Messages",
    href: "/Contact",
    query: () => countTable("contact"),
  },
];

export default function StatsOverview() {
  const [values, setValues] = useState<(number | null)[]>(
    Array(statDefs.length).fill(null)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const results = await Promise.all(statDefs.map((s) => s.query()));
      if (isMounted) {
        setValues(results);
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {statDefs.map((stat, i) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
        >
          <span className="text-[12.5px] font-medium text-gray-500 dark:text-gray-400">
            {stat.label}
          </span>
          <div className="mt-2">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-[22px] font-semibold text-gray-800 dark:text-white/90">
                {values[i] === null ? "—" : values[i]}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
