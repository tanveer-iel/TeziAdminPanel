"use client";

import React, { useState } from "react";
import ComponentCard from "../common/ComponentCard";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";

interface EconmicCalenderModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}

export default function EconomicModal({setValue}:EconmicCalenderModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [symbol, setSymbol] = useState("");
  const [date, setDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setSymbol("");
    setDate("");
    setError(null);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !date) {
      setError("Symbol and Date are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("economic_calender").insert([
        {
          symbol,
          date,
        },
      ]);

      if (error) throw error;

      setValue(true)
      handleClose();

    } catch (err) {
         let errorMessage = "Something went wrong";

  if (err instanceof Error) {
    errorMessage = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    // Handle Supabase/Postgrest/Storage errors that are plain objects
    errorMessage = (err as { message: string }).message;
  }
  setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title="Add Economic Calendar">
      <Button size="sm" onClick={openModal}>
        Add Economic Calendar
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            Add Economic Calendar
          </h4>

          {/* Symbol */}
          <div>
            <Label>
              Symbol <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter symbol (e.g. USD)"
              defaultValue={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>

          {/* Date */}
          <div>
            <Label>
              Date <span className="text-error-500">*</span>
            </Label>
            <Input
              type="date"
              defaultValue={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Error */}
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
              disabled={loading}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}