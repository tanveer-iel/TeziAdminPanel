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
import IconButton from "../ui/button/IconButton";
import { PencilIcon } from "../ui/button/icons";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

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

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      ielInfo,
      (item, q) =>
        item.email.toLowerCase().includes(q) || item.phone.toLowerCase().includes(q),
      PAGE_SIZE
    );

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

  if (ielInfo.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No IEL information found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search by email or phone…" />

        {filteredCount === 0 ? (
          <div className="p-8 text-center text-[13px] text-gray-500">
            No records match your search.
          </div>
        ) : (
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Email
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Phone
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
            {paginated.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.email || "-"}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {item.phone || "-"}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {formatDate(item.created_at)}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(item)}>
                      <PencilIcon />
                    </IconButton>
                  </div>
                </TableCell>
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

      {/* ---------------- EDIT MODAL ---------------- */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[440px] p-5"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
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
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
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
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>

            <Button size="sm">
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
