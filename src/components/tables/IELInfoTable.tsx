"use client";

import React, { useEffect, useState } from "react";
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
import { Modal } from "../ui/modal";
import Label from "../form/Label";

interface IELInfo {
  id: number | string;
  email: string;
  phone: string;
  created_at: string;
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

export default function IELInfoTable({ value, setValue }: ModalProps) {
  const [ielInfo, setIelInfo] = useState<IELInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<IELInfo | null>(null);

  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date.replace(" ", "T")));
  };

  // ---------------- FETCH IEL INFO ----------------
  useEffect(() => {
    async function fetchIELInfo() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("iel_info")
          .select("id, email, phone, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setIelInfo(data || []);
      } catch (err) {
        console.error("Error fetching IEL info:", err);
        setError("Failed to load IEL information. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchIELInfo();
  }, [value]);

  // ---------------- EDIT ----------------
  const handleEdit = (item: IELInfo) => {
    setSelectedInfo(item);
    setEditEmail(item.email || "");
    setEditPhone(item.phone || "");
    setIsEditOpen(true);
  };

  // ---------------- UPDATE ----------------
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInfo) return;

    try {
      const { error } = await supabase
        .from("iel_info")
        .update({
          email: editEmail,
          phone: editPhone,
        })
        .eq("id", selectedInfo.id);

      if (error) throw error;

      toast.success("IEL information updated successfully");

      setIsEditOpen(false);
      setSelectedInfo(null);
      setEditEmail("");
      setEditPhone("");

      // Refresh table
      setValue((prev) => !prev);
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update IEL information");
    }
  };

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading IEL information...
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

  if (ielInfo.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No IEL information found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Email
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Phone
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

          <TableBody>
            {ielInfo.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.email || "-"}
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.phone || "-"}
                </TableCell>

                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {formatDate(item.created_at)}
                </TableCell>

                <TableCell className="px-4 py-3">
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ---------------- EDIT MODAL ---------------- */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Update IEL Information
          </h4>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Enter email"
            />
          </div>

          {/* Phone */}
          <div>
            <Label>Phone</Label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>

            <Button
              className="bg-brand-500 text-white"
            >
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}