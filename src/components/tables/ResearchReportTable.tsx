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
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
import { TableSkeleton } from "../ui/skeleton/Skeleton";

/* OLD TAB CONSTANT REMOVED (NOT NEEDED) */

interface Profile {
  id: number | string;
  sector_name: string;
   name: string;
  pdf_url: string;
}

interface Sector {
  id: number | string;
  sector_name: string;
}

interface ModalProps {
  setValue: (value: boolean) => void;
  value: boolean;
}

export default function ReseaerchReportTable({ value, setValue }: ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFinancial, setselectedFinancial] = useState<Profile | null>(null);

  const [editSector, seteditSector] = useState("");
  const [editName, setEditName] = useState("");
  const [editpdf, seteditpdf] = useState<File | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ================= FETCH RESEARCH ================= */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("research")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setBlogsData(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [value]);

  /* ================= FETCH SECTORS ================= */
  useEffect(() => {
    async function fetchSectors() {
      const { data, error } = await supabase
        .from("sector")
        .select("*")
        .order("sector_name", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setSectors(data || []);
    }

    fetchSectors();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id: number | string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("research")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBlogsData((prev) => prev.filter((item) => item.id !== id));
      toast.success("Record deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ================= EDIT ================= */
const handleEdit = (item: Profile) => {
  setselectedFinancial(item);
  setEditName(item.name || "");
  seteditSector(item.sector_name);
  setIsEditOpen(true);
};

  /* ================= UPDATE ================= */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinancial) return;

    try {
      let pdfUrl = selectedFinancial.pdf_url;

      /* upload new pdf if selected */
      if (editpdf) {
        const fileName = `${Date.now()}-${editpdf.name}`;

        const { error: uploadError } = await supabase.storage
          .from("PDF Files")
          .upload(fileName, editpdf);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("PDF Files")
          .getPublicUrl(fileName);

        pdfUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("research")
      .update({
  name: editName,
  sector_name: editSector,
  pdf_url: pdfUrl,
})
        .eq("id", selectedFinancial.id);

      if (error) throw error;

      toast.success("Research Report updated successfully");

      setIsEditOpen(false);
      setValue(!value);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update Research Report");
    }
  };

  /* ================= UI STATES ================= */
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

  if (BlogsData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Finncial Statements found.
      </div>
    );
  }

  return (
    <>
      {/* ================= TABLE ================= */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Name
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Sector
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                PDF
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {BlogsData.map((items) => (
              <TableRow key={items.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {items.name}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {items.sector_name}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-start">
                  <button
                    type="button"
                    onClick={() => window.open(items.pdf_url, "_blank")}
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    View PDF
                  </button>
                </TableCell>

                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(items)}>
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      variant="danger"
                      onClick={() => setDeleteTarget(items)}
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

      {/* ================= EDIT MODAL ================= */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-5">

          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Update Research Report
          </h4>

<div>
  <Label>
    Report Name <span className="text-error-500">*</span>
  </Label>

  <input
    type="text"
    value={editName}
    onChange={(e) => setEditName(e.target.value)}
    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
    required
  />
</div>
          {/* Sector Dropdown */}
          <div>
            <Label>Sector</Label>
            <select
              value={editSector}
              onChange={(e) => seteditSector(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              required
            >
              <option value="" disabled>
                Select Sector
              </option>
              {sectors.map((option) => (
                <option key={option.id} value={option.sector_name}>
                  {option.sector_name}
                </option>
              ))}
            </select>
          </div>

          {/* PDF */}
          <div>
            <Label>Upload PDF</Label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                seteditpdf(e.target.files?.[0] || null)
              }
              className="w-full text-[13px] text-gray-600 dark:text-gray-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
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

      {/* ================= DELETE CONFIRM ================= */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete record?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.name}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
