"use client";
import React from "react";
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
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[400px] p-5" showCloseButton={false}>
      <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">{title}</h4>
      {description && (
        <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={loading}
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
