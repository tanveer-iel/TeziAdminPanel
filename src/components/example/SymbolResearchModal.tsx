"use client";

import React, { useState } from "react";
import ComponentCard from "../common/ComponentCard";
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
    <ComponentCard title="Add Symbol Research">
      <Button size="sm" onClick={openModal}>
        Add Symbol Research Report
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-5 lg:p-8 mt-[700px]"
      >
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}
        >
          <h2 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
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
              className="
                w-full rounded-lg border border-gray-300
                bg-white px-4 py-2.5 text-gray-700
                shadow-sm outline-none transition-all
                focus:border-primary-500 focus:ring-2
                focus:ring-primary-200
                disabled:cursor-not-allowed
                disabled:bg-gray-100
                dark:border-gray-600
                dark:bg-gray-800
                dark:text-gray-200
              "
            />
          </div>

          {/* ================= THE CASE ================= */}

          <div>
            <Label>
              The Case
            </Label>

            <p className="mb-2 text-xs text-gray-500">
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
              className="
                w-full rounded-lg border border-gray-300
                bg-white px-4 py-3 text-gray-700
                shadow-sm outline-none transition-all
                focus:border-primary-500 focus:ring-2
                focus:ring-primary-200
                disabled:cursor-not-allowed
                disabled:bg-gray-100
                dark:border-gray-600
                dark:bg-gray-800
                dark:text-gray-200
              "
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
              className="
                w-full rounded-lg border border-gray-300
                bg-white px-4 py-3 text-gray-700
                shadow-sm outline-none transition-all
                focus:border-primary-500 focus:ring-2
                focus:ring-primary-200
                disabled:cursor-not-allowed
                disabled:bg-gray-100
                dark:border-gray-600
                dark:bg-gray-800
                dark:text-gray-200
              "
            />
          </div>

          {/* ================= CURRENT RATING ================= */}

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
                />
              </div>
            </div>
          </div>

          {/* ================= PREVIOUS RATING ================= */}

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
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
                  className="
                    w-full rounded-lg border border-gray-300
                    bg-white px-4 py-2.5 text-gray-700
                    outline-none
                    focus:border-primary-500
                    focus:ring-2 focus:ring-primary-200
                    dark:border-gray-600
                    dark:bg-gray-800
                    dark:text-gray-200
                  "
                />
              </div>
            </div>
          </div>

          {/* ================= FULL NOTE ================= */}

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
              Full Note
            </h3>

            {/* Document Title */}

            <div className="mb-5">
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
                className="
                  w-full rounded-lg border border-gray-300
                  bg-white px-4 py-2.5 text-gray-700
                  outline-none
                  focus:border-primary-500
                  focus:ring-2 focus:ring-primary-200
                  dark:border-gray-600
                  dark:bg-gray-800
                  dark:text-gray-200
                "
              />
            </div>

            {/* PDF */}

            <div>
              <Label>
                Upload PDF{" "}
                <span className="text-error-500">*</span>
              </Label>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) =>
                  setPdfFile(
                    e.target.files?.[0] || null
                  )
                }
                disabled={loading}
                className="
                  w-full text-sm text-gray-600
                  file:mr-4 file:rounded
                  file:border-0
                  file:bg-primary-50
                  file:px-4 file:py-2
                  file:text-sm
                  file:font-semibold
                  file:text-primary-700
                  hover:file:bg-primary-100
                  dark:file:bg-gray-700
                  dark:file:text-gray-200
                "
              />

              {pdfFile && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected: {pdfFile.name}
                </p>
              )}
            </div>
          </div>

          {/* ================= BUTTONS ================= */}

          <div className="mt-6 flex items-center justify-end gap-3">
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
    </ComponentCard>
  );
}