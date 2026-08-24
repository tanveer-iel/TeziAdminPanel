"use client";

import React, { useState } from "react";
import ComponentCard from "../common/ComponentCard";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

interface StockLogoModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function StockLogoModal({ setValue }: StockLogoModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSymbol("");
    setImage(null);
    setError(null);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim() || !image) {
      setError("Symbol and Logo Image are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upload image
     const fileName = `${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("Images")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("Images")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // 3. Insert into stocklogos table
      const { error: dbError } = await supabase
        .from("stocklogos")
        .insert([
          {
            symbol: symbol,
            img_url: imageUrl,           // ← Change to img_url if your column name is different
          },
        ]);

      if (dbError) throw dbError;

      toast.success("Stock logo added successfully!");

      setValue((prev) => !prev); // Refresh the table
      handleClose();
    } catch (err: any) {
      console.error("Submit Error:", err);

      let errorMessage = "Failed to add stock logo. Please try again.";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      }

      // Helpful message if column name is wrong
      if (errorMessage.toLowerCase().includes("column") || 
          errorMessage.toLowerCase().includes("does not exist")) {
        errorMessage = "Column error: Make sure your image column is named 'img' (not 'img_url') in the stocklogos table.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title="Add Stock Logo">
      <Button size="sm" onClick={openModal}>
        Add Stock Logo
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Add New Stock Logo
          </h4>

          {/* Symbol */}
          <div>
            <Label>
              Symbol <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter stock symbol (e.g. AAPL)"
              defaultValue={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label>
              Logo Image <span className="text-error-500">*</span>
            </Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              disabled={loading}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              required
            />
           
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={loading || !symbol.trim() || !image}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {loading ? "Uploading..." : "Add Stock Logo"}
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}