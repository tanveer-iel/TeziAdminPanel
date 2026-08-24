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
import IconButton from "../ui/button/IconButton";
import { PencilIcon, TrashIcon } from "../ui/button/icons";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { TableSkeleton } from "../ui/skeleton/Skeleton";

interface Profile {
  id: number | string;
  symbol: string;
  date: string;
}

interface ModalProps {
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}

export default function EconomicTable({ value }:ModalProps) {
  const [economicCalender, seteconomicCalender] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* UPDATE STATES */
  const { isOpen, openModal, closeModal } = useModal();
  const [editId, setEditId] = useState<number | string | null>(null);
  const [symbol, setSymbol] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchEconomicCalender() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("economic_calender")
          .select("id, symbol, date")
          .order("created_at", { ascending: false });

        if (error) throw error;

        seteconomicCalender(data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchEconomicCalender();
  }, [value]);

  /* OPEN EDIT MODAL */

const handleEdit = (item: Profile) => {
  setEditId(item.id);
  setSymbol(item.symbol || "");

  // Convert "20 Dec 2025" -> "2025-12-20"
  const parsedDate = new Date(item.date);
  const formattedDate = parsedDate.toISOString().slice(0, 10);

  setDate(formattedDate);

  openModal();
};

  /* UPDATE FUNCTION */

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !date) {
      toast.error("Symbol and Date are required");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("economic_calender")
        .update({
          symbol,
          date,
        })
        .eq("id", editId);

      if (error) throw error;

      seteconomicCalender((prev) =>
        prev.map((item) =>
          item.id === editId ? { ...item, symbol, date } : item
        )
      );

      toast.success("Record updated successfully");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  /* DELETE FUNCTION */

  const handleDelete = async (id: number | string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("economic_calender")
        .delete()
        .eq("id", id);

      if (error) throw error;

      seteconomicCalender((prev) => prev.filter((item) => item.id !== id));

      toast.success("Record deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={4} />
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

  if (economicCalender.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Economic Calendar found.
      </div>
    );
  }


  console.log(symbol)
  console.log(date)

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Id
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Symbol
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Date
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {economicCalender.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.id}
                </TableCell>

                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.symbol}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.date}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(item)}>
                      <PencilIcon />
                    </IconButton>
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

      {/* UPDATE MODAL */}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[440px] p-5"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Update Economic Calendar
          </h4>

          <div>
            <Label>Symbol</Label>
            <Input
              type="text"
              defaultValue={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              defaultValue={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={closeModal}
            >
              Cancel
            </Button>

            <Button size="sm" disabled={saving}>
              {saving ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete record?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.symbol}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
