"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

interface ModalProps {
  setValue: (value: boolean) => void;
}

export default function SymbolResearchModal({ setValue }: ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  // =========================
  // FORM STATES
  // =========================

  const [symbol, setSymbol] = useState("");

  // The Case
  const [casePoints, setCasePoints] = useState("");

  // Key Risk
  const [keyRisk, setKeyRisk] = useState("");

  // Current Rating
  const [currentRating, setCurrentRating] = useState("");
  const [currentRatingDate, setCurrentRatingDate] = useState("");
  const [currentRatingPrice, setCurrentRatingPrice] = useState("");

  // Previous Rating
  const [previousRating, setPreviousRating] = useState("");
  const [previousRatingPeriod, setPreviousRatingPeriod] = useState("");
  const [previousRatingPrice, setPreviousRatingPrice] = useState("");

  // Full Note
  const [documentTitle, setDocumentTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    setSymbol("");
    setCasePoints("");
    setKeyRisk("");

    setCurrentRating("");
    setCurrentRatingDate("");
    setCurrentRatingPrice("");

    setPreviousRating("");
    setPreviousRatingPeriod("");
    setPreviousRatingPrice("");

    setDocumentTitle("");
    setPdfFile(null);
  };

  // =========================
  // UPLOAD
  // =========================

  const handleUpload = async () => {
    try {
      // =========================
      // REQUIRED VALIDATION
      // =========================

      if (!symbol.trim()) {
        toast.error("Please enter symbol");
        return;
      }

      if (!documentTitle.trim()) {
        toast.error("Please enter document title");
        return;
      }

      if (!pdfFile) {
        toast.error("Please select a PDF file");
        return;
      }

      if (pdfFile.type !== "application/pdf") {
        toast.error("Please select a valid PDF file");
        return;
      }

      setLoading(true);

      // =========================
      // CONVERT CASE POINTS
      // =========================

      /*
       * Each line becomes one item in TEXT[]
       *
       * Example:
       *
       * Strong earnings
       * Improving margins
       * Stable cash flow
       *
       * becomes:
       *
       * [
       *   "Strong earnings",
       *   "Improving margins",
       *   "Stable cash flow"
       * ]
       */

      const casePointsArray = casePoints
        .split("\n")
        .map((point) => point.trim())
        .filter((point) => point.length > 0);

      // =========================
      // VALIDATE NUMBERS
      // =========================

      const currentPrice =
        currentRatingPrice.trim() !== ""
          ? Number(currentRatingPrice)
          : null;

      const previousPrice =
        previousRatingPrice.trim() !== ""
          ? Number(previousRatingPrice)
          : null;

      if (
        currentRatingPrice.trim() !== "" &&
        Number.isNaN(currentPrice)
      ) {
        toast.error("Current rating price must be a valid number");
        return;
      }

      if (
        previousRatingPrice.trim() !== "" &&
        Number.isNaN(previousPrice)
      ) {
        toast.error("Previous rating price must be a valid number");
        return;
      }

      // =========================
      // FILE NAME
      // =========================

      const safeFileName = pdfFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const cleanSymbol = symbol.trim().toUpperCase();

      const fileName = `${cleanSymbol}/${Date.now()}-${safeFileName}`;

      // =========================
      // UPLOAD PDF
      // =========================

      const { error: uploadError } = await supabase.storage
        .from("PDF Files")
        .upload(fileName, pdfFile, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("PDF upload error:", uploadError);
        toast.error("PDF upload failed");
        return;
      }

      // =========================
      // GET PUBLIC URL
      // =========================

      const { data: publicUrlData } = supabase.storage
        .from("PDF Files")
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData.publicUrl;

      if (!pdfUrl) {
        toast.error("Could not generate PDF URL");
        return;
      }

      // =========================
      // INSERT INTO DATABASE
      // =========================

      const { error: insertError } = await supabase
        .from("symbol_research")
        .insert([
          {
            symbol: cleanSymbol,

            // The Case
            case_points:
              casePointsArray.length > 0
                ? casePointsArray
                : null,

            // Key Risk
            key_risk: keyRisk.trim() || null,

            // Current Rating
            current_rating: currentRating.trim() || null,
            current_rating_date:
              currentRatingDate.trim() || null,
            current_rating_price: currentPrice,

            // Previous Rating
            previous_rating:
              previousRating.trim() || null,
            previous_rating_period:
              previousRatingPeriod.trim() || null,
            previous_rating_price: previousPrice,

            // Full Note
            document_title: documentTitle.trim(),
            document_url: pdfUrl,
          },
        ]);

      if (insertError) {
        console.error("Database insert error:", insertError);

        // Remove uploaded PDF if database insert fails
        await supabase.storage
          .from("PDF Files")
          .remove([fileName]);

        toast.error(
          "Error saving research: " + insertError.message
        );

        return;
      }

      // =========================
      // SUCCESS
      // =========================

      toast.success(
        "Symbol research added successfully"
      );

      resetForm();

      setValue(true);
      closeModal();
    } catch (error) {
      console.error("Unexpected error:", error);
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
        Add Symbol Research Report
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-5 lg:p-8 mt-[700px]"
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}
        >
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add Symbol Research Report
          </h2>

          {/* ================= SYMBOL ================= */}

          <div>
            <Label>
              Symbol <span className="text-error-500">*</span>
            </Label>

            <input
              type="text"
              value={symbol}
              onChange={(e) =>
                setSymbol(e.target.value.toUpperCase())
              }
              disabled={loading}
              placeholder="e.g. MCB"
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* ================= THE CASE ================= */}

          <div>
            <Label>
              The Case
            </Label>

            <p className="mb-1.5 text-[12px] text-gray-400">
              Add one point per line.
            </p>

            <textarea
              value={casePoints}
              onChange={(e) =>
                setCasePoints(e.target.value)
              }
              disabled={loading}
              rows={5}
              placeholder={`Strong earnings growth
Improving margins
Stable cash flows
Strong market position`}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* ================= KEY RISK ================= */}

          <div>
            <Label>
              Key Risk
            </Label>

            <textarea
              value={keyRisk}
              onChange={(e) =>
                setKeyRisk(e.target.value)
              }
              disabled={loading}
              rows={3}
              placeholder="Enter the key risk..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* ================= CURRENT RATING ================= */}

          <div className="rounded-md border border-gray-200 p-3.5 dark:border-gray-700">
            <h3 className="mb-3 text-[13px] font-semibold text-gray-800 dark:text-white">
              Current Rating
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Rating */}

              <div>
                <Label>Rating</Label>

                <select
                  value={currentRating}
                  onChange={(e) =>
                    setCurrentRating(e.target.value)
                  }
                  disabled={loading}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="">Select Rating</option>
                  <option value="BUY">BUY</option>
                  <option value="HOLD">HOLD</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              {/* Date */}

              <div>
                <Label>Date</Label>

                <input
                  type="text"
                  value={currentRatingDate}
                  onChange={(e) =>
                    setCurrentRatingDate(e.target.value)
                  }
                  disabled={loading}
                  placeholder="e.g. Aug 2026"
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>

              {/* Price */}

              <div>
                <Label>Target Price</Label>

                <input
                  type="number"
                  step="0.01"
                  value={currentRatingPrice}
                  onChange={(e) =>
                    setCurrentRatingPrice(e.target.value)
                  }
                  disabled={loading}
                  placeholder="e.g. 426.28"
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          {/* ================= PREVIOUS RATING ================= */}

          <div className="rounded-md border border-gray-200 p-3.5 dark:border-gray-700">
            <h3 className="mb-3 text-[13px] font-semibold text-gray-800 dark:text-white">
              Previous Rating
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Rating */}

              <div>
                <Label>Rating</Label>

                <select
                  value={previousRating}
                  onChange={(e) =>
                    setPreviousRating(e.target.value)
                  }
                  disabled={loading}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="">Select Rating</option>
                  <option value="BUY">BUY</option>
                  <option value="HOLD">HOLD</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>

              {/* Period */}

              <div>
                <Label>Period</Label>

                <input
                  type="text"
                  value={previousRatingPeriod}
                  onChange={(e) =>
                    setPreviousRatingPeriod(e.target.value)
                  }
                  disabled={loading}
                  placeholder="e.g. Last quarter"
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>

              {/* Price */}

              <div>
                <Label>Target Price</Label>

                <input
                  type="number"
                  step="0.01"
                  value={previousRatingPrice}
                  onChange={(e) =>
                    setPreviousRatingPrice(e.target.value)
                  }
                  disabled={loading}
                  placeholder="e.g. 418.19"
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          {/* ================= FULL NOTE ================= */}

          <div className="rounded-md border border-gray-200 p-3.5 dark:border-gray-700">
            <h3 className="mb-3 text-[13px] font-semibold text-gray-800 dark:text-white">
              Full Note
            </h3>

            {/* Document Title */}

            <div className="mb-4">
              <Label>
                Document Title{" "}
                <span className="text-error-500">*</span>
              </Label>

              <input
                type="text"
                value={documentTitle}
                onChange={(e) =>
                  setDocumentTitle(e.target.value)
                }
                disabled={loading}
                placeholder="e.g. MCB Research Report"
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </div>

            {/* PDF */}

            <div>
              <Label>
                Upload PDF{" "}
                <span className="text-error-500">*</span>
              </Label>

              <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) =>
                    setPdfFile(
                      e.target.files?.[0] || null
                    )
                  }
                  disabled={loading}
                  className="block w-full text-[13px] text-gray-600 dark:text-gray-400"
                />
              </div>

              {pdfFile && (
                <p className="mt-1.5 text-[12px] text-success-600">
                  Selected: {pdfFile.name}
                </p>
              )}
            </div>
          </div>

          {/* ================= BUTTONS ================= */}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeModal}
              size="sm"
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              disabled={loading}
              size="sm"
            >
              {loading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}