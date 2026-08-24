"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import IconButton from "../ui/button/IconButton";
import { TrashIcon } from "../ui/button/icons";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { TableSkeleton } from "../ui/skeleton/Skeleton";

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

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setDeleting(true);
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
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={6} />
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

  if (raastData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Raast IDs found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Raast IBAN
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Client Code
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Client Name
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Folio Number
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Created At
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {raastData.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="break-all">
                      {item.raastiban}
                    </span>

                    <IconButton
                      title="Copy IBAN"
                      onClick={() => handleCopy(item.raastiban)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.clientcode}
                </TableCell>

                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.clientname}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.folionumber}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton
                      title="Delete"
                      variant="danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Raast ID?"
        description={deleteTarget ? `This will permanently remove the record for "${deleteTarget.clientname}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
