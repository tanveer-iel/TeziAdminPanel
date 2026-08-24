"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import TextArea from "../form/input/TextArea";

interface ModalProps {
  setValue: (value: boolean) => void;
}

export default function BankModal({ setValue }: ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- ADD BANK ----------------
  const handleUpload = async () => {
    try {
      if (!bankName.trim()) {
        toast.error("Please enter bank name");
        return;
      }

      setLoading(true);

      const { error } = await supabase.from("bank_list").insert([
        {
          name: bankName.trim(),
        },
      ]);

      if (error) {
        console.error(error);
        toast.error(error.message || "Failed to add bank");
        return;
      }

      toast.success("Bank added successfully");

      setBankName("");
      setValue(true); // refresh table
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error occurred");
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
        Add Bank
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[440px] p-5"
      >
        <form className="space-y-5">
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add New Bank
          </h2>

          {/* Bank Name */}
          <div>
            <Label>
              Bank Name <span className="text-error-500">*</span>
            </Label>

            <TextArea
              value={bankName}
              onChange={(value) => setBankName(value)}
              placeholder="Enter bank name..."
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeModal}
              size="sm"
              disabled={loading}
            >
              Cancel
            </Button>

            <Button onClick={handleUpload} disabled={loading} size="sm">
              {loading ? "Adding…" : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
