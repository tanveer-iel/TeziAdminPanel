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
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
// import Input from "../form/input/InputField";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner"; // Optional: for nice notifications (recommended)
import TextArea from "../form/input/TextArea";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

interface Profile {
  id:  number| string;
  short_des:  string;
  pdf: string;

}

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function NewsTable({value, setValue}:ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<Profile | null>(null);

  const [editshortdesc, seteditshortdesc] = useState("");
  const [editpdf, seteditpdf] = useState<File | null>(null);;

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      BlogsData,
      (item, q) => item.short_des?.toLowerCase().includes(q),
      PAGE_SIZE
    );

  useEffect(() => {
    async function fetchBlogs() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("news")
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
          .from("news")
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
  setSelectedNews(blog);
  seteditshortdesc(blog.short_des);
  setIsEditOpen(true);
};


const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedNews) return;

  try {
    let pdfUrl = selectedNews.pdf;

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
      .from("news")
      .update({
        short_des: editshortdesc,
        pdf: pdfUrl,
      })
      .eq("id", selectedNews.id);

    if (error) throw error;

    toast.success("News updated successfully");

    setIsEditOpen(false);
    setValue(!value);

  } catch (err) {
    console.error(err);
    toast.error("Failed to update News");
  }
};
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={3} />
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
        No News found.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <TableSearchBar value={search} onChange={setSearch} placeholder="Search news…" />

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
                {items.short_des}
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

    <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Update News</h4>

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
