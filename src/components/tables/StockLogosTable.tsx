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
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

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
      } catch (err: any) {
        console.error("Error fetching stock logos:", err);
        setError("Failed to load stock logos. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchLogos();
  }, [value]); // Re-fetch when parent triggers refresh

  const handleDelete = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

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
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error("Failed to update stock logo");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Stock Logos...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (logosData.length === 0) return <div className="p-8 text-center text-gray-500">No stock logos found.</div>;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Image
              </TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Symbol
              </TableCell>
           
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {logosData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-4 py-3">
                  <img
                    src={item.img_url}
                    alt={item.symbol}
                    className="w-[50px] h-[50px] object-contain rounded"
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-medium">
                  {item.symbol}
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-500 dark:text-gray-400">Update Stock Logo</h4>

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
                className="w-32 h-32 object-contain mt-2 border rounded-lg"
              />
            </div>
          )}

          {/* New Image Upload */}
          <div>
            <Label>Change Image (optional)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEditImage(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-gray-600 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current image</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
            
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button  className="bg-brand-500 text-white">
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}