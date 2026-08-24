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
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import TextArea from "../form/input/TextArea";

/* OLD TAB CONSTANT REMOVED (NOT NEEDED) */

interface Profile {
  id: number | string;
  sector_name: string;
  symbol: string;
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

export default function IELReseaerchReportTable({ value, setValue }: ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFinancial, setselectedFinancial] = useState<Profile | null>(null);

  const [editSector, seteditSector] = useState("");
  const [editName, setEditName] = useState("");
  const [editpdf, seteditpdf] = useState<File | null>(null);

  /* ================= FETCH RESEARCH ================= */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("research_iel")
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
        .from("sector_iel")
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
    const confirmDelete = confirm("Are you sure you want to delete this record?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("research_iel")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBlogsData((prev) => prev.filter((item) => item.id !== id));
      toast.success("Record deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete record");
    }
  };

  /* ================= EDIT ================= */
const handleEdit = (item: Profile) => {
  setselectedFinancial(item);
  setEditName(item.symbol || "");
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
        .from("research_iel")
      .update({
  symbol: editName,
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

  /* ================= UI STATES (UNCHANGED) ================= */
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Finncial Statements...
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

  if (BlogsData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Finncial Statements found.
      </div>
    );
  }

  return (
    <>
      {/* ================= TABLE (UNCHANGED DESIGN) ================= */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Symbol</TableCell>
                <TableCell isHeader  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sector</TableCell>
                <TableCell isHeader  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">PDF</TableCell>
                <TableCell isHeader  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {BlogsData.map((items) => (
                <TableRow key={items.id}>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.symbol}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.sector_name}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => window.open(items.pdf_url, "_blank")}
                      className="text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Open PDF
                    </Button>
                  </TableCell>

                  <TableCell className="px-4 py-3 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleEdit(items)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleDelete(items.id)}
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

      {/* ================= MODAL (UNCHANGED DESIGN) ================= */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">

          <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">
            Update Research Report
          </h4>

<div>
  <Label>
    Symbol <span className="text-error-500">*</span>
  </Label>

  <input
    type="text"
    value={editName}
    onChange={(e) => setEditName(e.target.value)}
    className="
      w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
      text-gray-700 shadow-sm outline-none
      transition-all focus:border-primary-500 focus:ring-2
      focus:ring-primary-200
      dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200
    "
    required
  />
</div>
          {/* Sector Dropdown */}
          <div>
            <Label>Sector</Label>
            <select
              value={editSector}
              onChange={(e) => seteditSector(e.target.value)}
                className={`
                w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 
                text-gray-700 shadow-sm outline-none 
                transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200 
                disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 
                dark:focus:border-primary-400 dark:focus:ring-primary-500/30
                dark:disabled:bg-gray-700 dark:disabled:text-gray-400
              `}
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
              className="w-full text-sm text-gray-600"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>

            <Button className="bg-brand-500 text-white">
              Update
            </Button>
          </div>

        </form>
      </Modal>
    </>
  );
}