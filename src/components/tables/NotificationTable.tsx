"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import supabase from "../../../SupabaseConfig";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

interface Notification {
  id: number | string;
  title: string;
  body: string;
  created_at?: string; // optional, if you have timestamp
}

interface ModalProps {
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function NotificationTable({value}:ModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      notifications,
      (notification, q) =>
        notification.title?.toLowerCase().includes(q) ||
        notification.body?.toLowerCase().includes(q),
      PAGE_SIZE
    );

  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("notifications")
          .select("id, title, body, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setNotifications(data || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, [value]);

  const hasDate = notifications.some((n) => n.created_at);
  const colCount = hasDate ? 3 : 2;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={colCount} />
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

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No notifications found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <TableSearchBar value={search} onChange={setSearch} placeholder="Search notifications…" />

      {filteredCount === 0 ? (
        <div className="p-8 text-center text-[13px] text-gray-500">
          No notifications match your search.
        </div>
      ) : (
      <Table>
        {/* Table Header */}
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>
            <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400 w-[30%]"
            >
              Title
            </TableCell>
            <TableCell
              isHeader
              className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
            >
              Message
            </TableCell>
            {hasDate && (
              <TableCell
                isHeader
                className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400 w-[180px]"
              >
                Date
              </TableCell>
            )}
          </TableRow>
        </TableHeader>

        {/* Table Body */}
        <TableBody>
          {paginated.map((notification) => (
            <TableRow
              key={notification.id}
              className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
            >
              {/* Title */}
              <TableCell className="px-4 py-2.5 text-start text-[13px] font-medium text-gray-800 dark:text-white/90">
                {notification.title}
              </TableCell>

              {/* Body/Message */}
              <TableCell className="px-4 py-2.5 text-start text-[12.5px] text-gray-500 dark:text-gray-400">
                {notification.body}
              </TableCell>

              {/* Created At (optional) */}
              {notification.created_at && (
                <TableCell className="px-4 py-2.5 text-start text-[12.5px] text-gray-500 dark:text-gray-400">
                  {new Date(notification.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}

      <TableFooter
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
