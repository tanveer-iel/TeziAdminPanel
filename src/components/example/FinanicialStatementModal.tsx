"use client";

import React, { useMemo, useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import TextArea from "../form/input/TextArea";
import { FINANCIAL_TABS } from "../../lib/financialStatementTabs";
import { resolveYearChoice } from "../../lib/financialYear";
import type { YearChoice } from "../../lib/financialYear";
import FinancialYearPicker from "../financials/FinancialYearPicker";
import { ensureFinancialYear } from "../../lib/financialYearDb";

const BUCKET = "PDF Files";

const inputClass =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

interface ModalProps {
  /** Called after a statement has been saved so the page can reload the list. */
  onSaved: () => void;
}

export default function FinancialStatementModal({ onSaved }: ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [shortDes, setShortDes] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [yearChoice, setYearChoice] = useState<YearChoice>("auto");
  const [periodEnd, setPeriodEnd] = useState(""); // "YYYY-MM-DD", only used for "Another year"
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  // Refreshed each time the form opens, so "Current" and "Previous" follow today's date
  const [today, setToday] = useState(() => new Date());

  const resolution = useMemo(
    () => resolveYearChoice(yearChoice, shortDes, tabTitle, periodEnd, today),
    [yearChoice, shortDes, tabTitle, periodEnd, today]
  );

  const handleOpen = () => {
    setToday(new Date());
    openModal();
  };

  const resetForm = () => {
    setShortDes("");
    setTabTitle("");
    setYearChoice("auto");
    setPeriodEnd("");
    setPdfFile(null);
  };

  const handleUpload = async () => {
    const title = shortDes.trim();

    if (!title || !tabTitle || !pdfFile) {
      toast.error("Please fill all required fields (description, tab, and PDF)");
      return;
    }

    // Work out the financial year before uploading anything, so a title
    // without a year never leaves an unused file behind.
    const fy = resolution.fy;
    if (!fy) {
      toast.error(
        "Choose the financial year: add the year to the description (for example 30 June 2026), or pick Current, Previous or Another year."
      );
      return;
    }

    setLoading(true);
    let uploadedName: string | null = null;

    try {
      // 1. Upload the PDF
      // The file keeps its own name. Only a timestamp prefix is added, so two
      // uploads with the same name never overwrite each other.
      const fileName = `${Date.now()}-${pdfFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, pdfFile, { contentType: "application/pdf" });
      if (uploadError) throw new Error("PDF upload failed");
      uploadedName = fileName;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      // 2. Find the financial year, creating it the first time it is needed
      const financialYearId = await ensureFinancialYear(fy);

      // 3. Save the statement under that year
      const { error: insertError } = await supabase
        .from("finanicial_statements")
        .insert([
          {
            short_des: title,
            tab: tabTitle,
            pdf: publicUrlData.publicUrl,
            financial_year_id: financialYearId,
          },
        ]);
      if (insertError) throw insertError;

      toast.success(`Financial Statement added under ${fy.label}`);
      resetForm();
      onSaved();
      closeModal();
    } catch (err) {
      console.error(err);

      // Do not leave an orphaned PDF in Storage when the save failed
      if (uploadedName) {
        await supabase.storage.from(BUCKET).remove([uploadedName]);
      }

      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "Unexpected error occurred";
      toast.error("Error saving data: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Financial Statement
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) handleUpload();
          }}
        >
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add Financial Statement
          </h2>

          {/* Description / document title */}
          <div>
            <Label>
              Description <span className="text-error-500">*</span>
            </Label>
            <TextArea
              value={shortDes}
              onChange={(value) => setShortDes(value)}
              placeholder="e.g. Quarter ended 30 Sept 2026"
              disabled={loading}
            />
          </div>

          {/* Statement type */}
          <div>
            <Label>
              Tab Title <span className="text-error-500">*</span>
            </Label>
            <select
              value={tabTitle}
              onChange={(e) => setTabTitle(e.target.value)}
              disabled={loading}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select financial statement type
              </option>
              {FINANCIAL_TABS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Financial year: automatic, current, previous, or another year */}
          <FinancialYearPicker
            choice={yearChoice}
            onChoiceChange={setYearChoice}
            periodEnd={periodEnd}
            onPeriodEndChange={setPeriodEnd}
            resolution={resolution}
            today={today}
            disabled={loading}
          />

          {/* PDF Upload */}
          <div>
            <Label>
              Upload PDF <span className="text-error-500">*</span>
            </Label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={loading}
              className="w-full text-[13px] text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-400 dark:file:bg-white/[0.05] dark:file:text-gray-200"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              size="sm"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={loading} size="sm">
              {loading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
