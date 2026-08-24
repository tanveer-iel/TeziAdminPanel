"use client";

import React, { useState, useEffect } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import { useModal } from "../../hooks/useModal";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";

interface ModalProps {
  setValue: (value: boolean) => void;
}

interface Sector {
  id: number | string;
  sector_name: string;
}

export default function IELResearchModal({ setValue }: ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [symbol, setSymbol] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [sectors, setSectors] = useState<Sector[]>([]);

  /* ================= FETCH SECTORS ================= */
  useEffect(() => {
    const fetchSectors = async () => {
      const { data, error } = await supabase
        .from("sector_iel")
        .select("*")
        .order("sector_name", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setSectors(data || []);
    };

    fetchSectors();
  }, []);

  /* ================= UPLOAD ================= */
  const handleUpload = async () => {
    try {
      if ( !sectorName || !pdfFile || !symbol) {
        toast.error("Please fill all required fields");
        return;
      }

      setLoading(true);

      const fileName = `${Date.now()}-${pdfFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("PDF Files")
        .upload(fileName, pdfFile);

      if (uploadError) {
        console.error(uploadError);
        toast.error("PDF upload failed");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("PDF Files")
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData.publicUrl;

      const { error } = await supabase.from("research_iel").insert([
        {
          symbol,
          sector_name: sectorName,
          pdf_url: pdfUrl,
        },
      ]);

      if (error) {
        console.error(error);
        toast.error("Error saving data: " + error.message);
      } else {
        toast.success("Research report added successfully");

        setSectorName("");
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
        Add Research Report
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
            handleUpload();
          }}
        >
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
            Add Research Report
          </h2>

          {/* REPORT NAME */}
          <div>
            <Label>
              Symbol <span className="text-error-500">*</span>
            </Label>

            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled={loading}
              placeholder="Enter symbol"
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          {/* SECTOR DROPDOWN */}
          <div>
            <Label>
              Sector <span className="text-error-500">*</span>
            </Label>

            <select
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
              disabled={loading}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">Select sector</option>

              {sectors.map((option) => (
                <option key={option.id} value={option.sector_name}>
                  {option.sector_name}
                </option>
              ))}
            </select>
          </div>

          {/* PDF UPLOAD */}
          <div>
            <Label>
              Upload PDF <span className="text-error-500">*</span>
            </Label>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={loading}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />

            {pdfFile && (
              <p className="mt-1.5 text-[12.5px] text-gray-500 dark:text-gray-400">
                Selected: {pdfFile.name}
              </p>
            )}
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

            <Button disabled={loading} size="sm">
              {loading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}