"use client";

import React, { useState } from "react";
import ComponentCard from "../common/ComponentCard";
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
    <ComponentCard title="Add Financial Statement">
      <Button size="sm" onClick={openModal}>
        Add Financial Statement
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form className="space-y-6">
          <h2 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
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
              className={`
                w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 
                text-gray-700 shadow-sm outline-none 
                transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200 
                disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 
                dark:focus:border-primary-400 dark:focus:ring-primary-500/30
                dark:disabled:bg-gray-700 dark:disabled:text-gray-400
              `}
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
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-700 dark:file:text-gray-200"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
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
    </ComponentCard>
  );
}