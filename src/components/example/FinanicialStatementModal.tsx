"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
// import Input from "../form/input/InputField"; 
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import TextArea from "../form/input/TextArea";

const FINANCIAL_TABS = [
  { value: "Audited Finantials 30 June", label: "Audited Finantials 30 June" },
  { value: "Half Yearly 31 Dec", label: "Half Yearly 31 Dec" },
  { value: "Quarter Ended 30 Sept", label: "Quarter Ended 30 Sept" },
  { value: "Quarter Ended 31 March", label: "Quarter Ended 31 March" },
  { value: "LCB", label: "LCB" },
];

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function FinancialStatementModal({ setValue }:ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [shortDes, setShortDes] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  // const [pdfFile, setPdfFile] = useState(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      if (!shortDes || !tabTitle || !pdfFile) {
        toast.error("Please fill all required fields (description, tab, and PDF)");
        return;
      }

      setLoading(true);

      const fileName = `${Date.now()}-${pdfFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("PDF Files")
        .upload(fileName, pdfFile);

      if (uploadError) {
        console.error(uploadError);
        toast.error("PDF upload failed");
        setLoading(false);
        return;
      }

      console.log(uploadData)

      const { data: publicUrlData } = supabase.storage
        .from("PDF Files")
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData.publicUrl;

      const { error } = await supabase.from("finanicial_statements").insert([
        {
          short_des: shortDes,
          tab: tabTitle,
          pdf: pdfUrl,
        },
      ]);

      if (error) {
        console.error(error);
        toast.error("Error saving data: " + (error.message || "Unknown error"));
      } else {
        toast.success("Financial Statement added successfully");

        setShortDes("");
        setTabTitle("");
        setPdfFile(null);
        setValue(true);
        closeModal();
      }
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
        Add Financial Statement
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form className="space-y-5">
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add Financial Statement
          </h2>

          {/* Short Description */}
          <div>
            <Label>
              Description <span className="text-error-500">*</span>
            </Label>
            <TextArea
              value={shortDes}
              onChange={(value) => setShortDes(value)}
              placeholder="Enter short description or news/title..."
            />
          </div>

          {/* Tab Title - Simple Select with Tailwind styling */}
          <div>
            <Label>
              Tab Title <span className="text-error-500">*</span>
            </Label>
            <select
              value={tabTitle}
              onChange={(e) => setTabTitle(e.target.value)}
              disabled={loading}
              required
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
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
              variant="outline"
              onClick={closeModal}
              size="sm"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
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