"use client";
import React, { useState } from "react";
import { Modal } from "./index";
import Button from "../button/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "default";
  /** If set, the user must type this text before the confirm button is enabled. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  variant = "danger",
  requireText,
  onConfirm,
  onCancel,
}) => {
  // The typed text belongs to one open dialog; it is ignored once the dialog closes or its target changes.
  const key = `${isOpen}|${requireText ?? ""}`;
  const [entry, setEntry] = useState({ key: "", value: "" });
  const typed = entry.key === key ? entry.value : "";
  const blocked = !!requireText && typed.trim().toLowerCase() !== requireText.trim().toLowerCase();
  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[400px] p-5" showCloseButton={false}>
      <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">{title}</h4>
      {description && (
        <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {requireText && (
        <div className="mt-3">
          <label className="mb-1 block text-[12px] text-gray-500 dark:text-gray-400">
            Type <span className="font-semibold text-gray-800 dark:text-white/90">{requireText}</span> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setEntry({ key, value: e.target.value })}
            autoFocus
            autoComplete="off"
            placeholder={requireText}
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-[13px] text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
          />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={loading || blocked}
          className={
            variant === "danger"
              ? "bg-error-500 text-white hover:bg-error-600 disabled:bg-error-300"
              : "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300"
          }
        >
          {loading ? "Please wait…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
