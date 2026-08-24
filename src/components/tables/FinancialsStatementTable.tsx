"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
// import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import IconButton from "../ui/button/IconButton";
import { PencilIcon, TrashIcon } from "../ui/button/icons";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner"; // Optional: for nice notifications (recommended)
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
// import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

const FINANCIAL_TABS = [
  { value: "Audited Finantials 30 June", label: "Audited Finantials 30 June" },
  { value: "Half Yearly 31 Dec", label: "Half Yearly 31 Dec" },
  { value: "Quarter Ended 30 Sept", label: "Quarter Ended 30 Sept" },
  { value: "Quarter Ended 31 March", label: "Quarter Ended 31 March" },
  { value: "LCB", label: "LCB" },
];

interface Profile {
  id:  number| string;
  short_des:  string;
  pdf: string;
  tab: string;

}

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function FinancialStatementTable({value, setValue}:ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedFinancial, setselectedFinancial] = useState<Profile | null>(null);

    const [editshortdesc, seteditshortdesc] = useState("");
    const [edittabtitle, setedittabtitle] = useState("");
    // const [editpdf, seteditpdf] = useState(null);
    const [editpdf, seteditpdf] = useState<File | null>(null);;

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      BlogsData,
      (row, q) => row.short_des.toLowerCase().includes(q),
      PAGE_SIZE
    );

  useEffect(() => {
    async function fetchBlogs() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("finanicial_statements")
          .select("*")
           .order("created_at", { ascending: false });

        if (error) throw error;



        setBlogsData(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, [value]);


    const handleDelete = async (id: number | string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("finanicial_statements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBlogsData((prev) => prev.filter((item) => item.id !== id));

      toast.success("Record deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };


      const handleEdit = (blog: Profile) => {
  setselectedFinancial(blog);
  seteditshortdesc(blog.short_des);
  setedittabtitle(blog.tab);
  setIsEditOpen(true);
};


const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedFinancial) return;

  try {
    let pdfUrl = selectedFinancial.pdf;

    /* If user selected new image */
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

    /* Update News record */

    const { error } = await supabase
      .from("finanicial_statements")
      .update({
        short_des: editshortdesc,
        tab:edittabtitle,
        pdf: pdfUrl,
      })
      .eq("id", selectedFinancial.id);

    if (error) throw error;

    toast.success("Financial Statement updated successfully");

    setIsEditOpen(false);
    setValue(!value);

  } catch (err) {
    console.error(err);
    toast.error("Failed to update Financial Statement");
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

  if (BlogsData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Finncial Statements found.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <TableSearchBar value={search} onChange={setSearch} placeholder="Search financial statements…" />

      {filteredCount === 0 ? (
        <div className="p-8 text-center text-[13px] text-gray-500">
          No records match your search.
        </div>
      ) : (
      <Table>
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              News
            </TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              Tab Title
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
          {paginated.map((items) => (
            <TableRow key={items.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
              <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                {items?.short_des}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                {items.tab}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-start">
                <button
                  type="button"
                  onClick={() => window.open(items.pdf, "_blank")}
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
      )}

      <TableFooter
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={filteredCount}
        pageSize={PAGE_SIZE}
      />
    </div>

     <Modal
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  className="max-w-[584px] p-5 lg:p-10"
>
  <form onSubmit={handleUpdate} className="space-y-5">

    <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Update Financial Statement</h4>

    {/* Title */}
    <div>
      <Label>News</Label>
      {/* <Input
        type="text"
        defaultValue={editshortdesc}
        onChange={(e) => seteditshortdesc(e.target.value)}
      /> */}
      <TextArea
              value={editshortdesc}
              onChange={(value) => seteditshortdesc(value)}
            />
    </div>

    <div>
            <Label>Tab Title</Label>
            <select
              value={edittabtitle}
              onChange={(e) => setedittabtitle(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="" disabled>
                Select financial statement type
              </option>
              {FINANCIAL_TABS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>




    {/* New Image */}
    <div>
      <Label>Upload PDF</Label>
        <input
              type="file"
              accept="pdf/*"
              onChange={(e) => seteditpdf(e.target.files?.[0] || null)}
              disabled={loading}
              className="w-full text-[13px] text-gray-600 dark:text-gray-400"
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

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete record?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.short_des}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}