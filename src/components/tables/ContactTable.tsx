"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
// import Badge from "../ui/badge/Badge";
import supabase from "../../../SupabaseConfig";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
// import { toast } from "sonner";

interface Profile {
  id:  number| string;
  full_name:  string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function ContactTable() {
  const [contactData, setcontactData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("contact")
          .select("id,full_name, email, phone,subject,message")
           .order("created_at", { ascending: false });

        if (error) throw error;



        setcontactData(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, []);


  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-error-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {error}
      </div>
    );
  }

  if (contactData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Contact found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <Table>
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>

            <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Full Name
            </TableCell>
            <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Email
            </TableCell>

              <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Phone Number
            </TableCell>

            <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Subject
            </TableCell>

             <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Message
            </TableCell>

          </TableRow>
        </TableHeader>

        <TableBody>
          {contactData.map((items) => (
            <TableRow key={items.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">

                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                 {items.full_name}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                {items.email}
              </TableCell>
               <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                {items.phone}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                {items.subject}
              </TableCell>

               <TableCell
                className="px-4 py-2.5 max-w-xs text-gray-500 text-start text-[12.5px] dark:text-gray-400"
              >
                <span className="block truncate" title={items.message}>
                  {items.message}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}