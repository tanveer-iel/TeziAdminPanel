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
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

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
    const confirmDelete = confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

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
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Economics...
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

  if (economicCalender.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Economic Calendar found.
      </div>
    );
  }


  console.log(symbol)
  console.log(date)

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] text-gray-500 text-start text-theme-sm dark:text-gray-400">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start">
                  Id
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  Symbol
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  Date
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {economicCalender.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3">
                    {item.id}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    {item.symbol}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    {item.date}
                  </TableCell>

                  <TableCell className="px-4 py-3 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleDelete(item.id)}
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

      {/* UPDATE MODAL */}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">
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

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
            >
              Cancel
            </Button>

            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white"
              disabled={saving}
            >
              {saving ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}