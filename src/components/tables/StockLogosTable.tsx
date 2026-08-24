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
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

interface StockLogo {
  id: number | string;
  symbol: string;        // Changed from title
  img_url: string;       // or 'img' depending on your actual column name
}

interface ModalProps {
  value: boolean;
  setValue: React.Dispatch<React.SetStateAction<boolean>>; // Correct typing
}

export default function StockLogosTable({ value, setValue }: ModalProps) {
  const [logosData, setLogosData] = useState<StockLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<StockLogo | null>(null);

  const [editSymbol, setEditSymbol] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StockLogo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      logosData,
      (logo, q) => logo.symbol.toLowerCase().includes(q),
      PAGE_SIZE
    );

  useEffect(() => {
    async function fetchLogos() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("stocklogos")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setLogosData(data || []);
      } catch (err) {
        console.error("Error fetching stock logos:", err);
        setError("Failed to load stock logos. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchLogos();
  }, [value]); // Re-fetch when parent triggers refresh

  const handleDelete = async (id: number | string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("stocklogos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLogosData((prev) => prev.filter((item) => item.id !== id));
      toast.success("Record deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete record");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = (logo: StockLogo) => {
    setSelectedLogo(logo);
    setEditSymbol(logo.symbol);
    setEditImage(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogo) return;

    try {
      let imageUrl = selectedLogo.img_url; // Keep old URL if no new image

      if (editImage) {
        const fileName = `${Date.now()}-${editImage.name}`;

        const { error: uploadError } = await supabase.storage
          .from("Images") // Make sure this bucket exists and is public
          .upload(fileName, editImage);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("Images")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("stocklogos")
        .update({
          symbol: editSymbol,
          img_url: imageUrl,        // Change to 'img' if your column name is different
        })
        .eq("id", selectedLogo.id);

      if (error) throw error;

      toast.success("Stock logo updated successfully");
      setIsEditOpen(false);
      setValue((prev) => !prev); // Trigger re-fetch in parent
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update stock logo");
    }
  };

  // ---------------- UI STATES ----------------
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

  if (logosData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No stock logos found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search stock logos…" />

        {filteredCount === 0 ? (
          <div className="p-8 text-center text-[13px] text-gray-500">
            No stock logos match your search.
          </div>
        ) : (
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Image
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Symbol
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5">
                  <img
                    src={item.img_url}
                    alt={item.symbol}
                    className="h-8 w-8 rounded-md object-contain border border-gray-100 dark:border-white/[0.05]"
                  />
                </TableCell>
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.symbol}
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
        )}

        <TableFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalCount={filteredCount}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Update Stock Logo</h4>

          {/* Symbol */}
          <div>
            <Label>Symbol</Label>
            <Input
              type="text"
              defaultValue={editSymbol}
              onChange={(e) => setEditSymbol(e.target.value)}
            />
          </div>

          {/* Current Image Preview */}
          {selectedLogo && (
            <div>
              <Label>Current Image</Label>
              <img
                src={selectedLogo.img_url}
                alt="Current"
                className="mt-2 h-16 w-16 rounded-md object-contain border border-gray-200 dark:border-white/[0.05]"
              />
            </div>
          )}

          {/* New Image Upload */}
          <div>
            <Label>Change Image (optional)</Label>
            <div className="mt-1 rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                className="block w-full text-[13px] text-gray-600 dark:text-gray-400"
              />
            </div>
            <p className="mt-1 text-[12px] text-gray-500">Leave empty to keep current image</p>
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

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete stock logo?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.symbol}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
