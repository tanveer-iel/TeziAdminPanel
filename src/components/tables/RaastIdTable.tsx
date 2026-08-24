"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "../ui/button/Button";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Profile {
  id: number | string;
  raastiban: string;
  clientcode: string;
  clientname: string;
  folionumber: string;
  created_at: string;
}

interface ModalProps {
  setValue: (value: boolean) => void;
  value: boolean;
}

export default function RaastIdTable({
  value,
  setValue,
}: ModalProps) {
  const [raastData, setRaastData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRaastIds() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("raastids")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRaastData(data || []);
      } catch (err) {
        console.error("Error fetching Raast IDs:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchRaastIds();
  }, [value]);

  const handleDelete = async (
    id: number | string
  ) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this record?"
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("raastids")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRaastData((prev) =>
        prev.filter((item) => item.id !== id)
      );

      toast.success(
        "Record deleted successfully"
      );
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete record");
    }
  };

 const handleCopy = (iban: string) => {
  navigator.clipboard
    .writeText(iban)
    .then(() => {
      toast.success("Raast IBAN copied successfully");
    })
    .catch((err) => {
      console.error("Copy error:", err);
      toast.error("Failed to copy IBAN");
    });
};

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Raast IDs...
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

  if (raastData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Raast IDs found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Raast IBAN
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Client Code
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Client Name
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Folio Number
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Created At
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {raastData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="break-all">
                      {item.raastiban}
                    </span>

                    <button
                   onClick={() => handleCopy(item.raastiban)}
                      className="text-gray-500 hover:text-brand-500 transition-colors"
                      title="Copy IBAN"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.clientcode}
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.clientname}
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.folionumber}
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </TableCell>

                <TableCell className="px-4 py-3">
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() =>
                      handleDelete(item.id)
                    }
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}