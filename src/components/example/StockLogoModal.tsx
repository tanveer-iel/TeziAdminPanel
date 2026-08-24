"use client";

import React, { useState } from "react";
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
    } catch (err) {
      console.error("Submit Error:", err);

      let errorMessage = "Failed to add stock logo. Please try again.";

      const errObj = err as { message?: string; error?: { message?: string } } | null;
      if (errObj?.message) {
        errorMessage = errObj.message;
      } else if (errObj?.error?.message) {
        errorMessage = errObj.error.message;
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
    <>
      <Button size="sm" onClick={openModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Stock Logo
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
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
            <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                disabled={loading}
                className="w-full text-[13px] text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[13px] file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-[13px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">
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
    </>
  );
}