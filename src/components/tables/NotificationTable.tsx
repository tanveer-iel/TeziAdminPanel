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

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No notifications found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="w-full">
        <div className="w-full">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[30%]"
                >
                  Title
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Message
                </TableCell>
                {notifications.some(n => n.created_at) && (
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-[180px]"
                  >
                    Date
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  {/* Title */}
                  <TableCell className="px-5 py-4 text-start">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {notification.title}
                    </span>
                  </TableCell>

                  {/* Body/Message */}
                  <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-300 text-theme-sm">
                    {notification.body}
                  </TableCell>

                  {/* Created At (optional) */}
                  {notification.created_at && (
                    <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-xs">
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
        </div>
      </div>
    </div>
  );
}