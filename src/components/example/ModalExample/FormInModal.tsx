"use client";

import React, { useState } from "react";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import Label from "../../form/Label";
import Input from "../../form/input/InputField";
import { useModal } from "../../../hooks/useModal";

const EDGE_FUNCTION_URL =
  "https://bfxmfaakufrmzcxhtgfw.supabase.co/functions/v1/swift-responder";
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeG1mYWFrdWZybXpjeGh0Z2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTQzMTIsImV4cCI6MjA3NTM5MDMxMn0.qtNn0qXNhn8ol8fTSb2Hp9nQkYfFA2Y_Zec4LuISPZQ";


    interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function FormInModal({setValue}:ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
           Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          // Add auth header if your edge function is protected
          // Authorization: `Bearer ${process.env.NEXT_PUBLIC_EDGE_SECRET}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      // Success
      setTitle("");
      setBody("");
      closeModal();
      alert("Notification sent successfully!");
      setValue(true)
    } catch (err) {
      console.error("Error:", err);
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

  const handleClose = () => {
    setTitle("");
    setBody("");
    setError(null);
    closeModal();
  };

  return (
    <>
      <Button size="sm" onClick={openModal}>
        Send Notification
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[440px] p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="space-y-5"
        >
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Send New Notification
          </h4>

          {/* Title */}
          <div>
            <Label>
              Title <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter notification title"
              defaultValue={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Body / Message - Fixed Textarea */}
          <div>
            <Label>
              Message <span className="text-error-500">*</span>
            </Label>
            <textarea
              placeholder="Write your notification message here..."
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-error-50 p-3 text-[12.5px] text-error-600 dark:bg-error-500/10 dark:text-error-400">
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
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
