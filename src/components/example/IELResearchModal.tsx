"use client";

import React, { useState, useEffect } from "react";
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
    <ComponentCard title="Add Research Report">
      <Button size="sm" onClick={openModal}>
        Add Research Report
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}
        >
          <h2 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
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
              className="
                w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                text-gray-700 shadow-sm outline-none
                transition-all focus:border-primary-500 focus:ring-2
                focus:ring-primary-200 disabled:cursor-not-allowed
                disabled:bg-gray-100 dark:border-gray-600
                dark:bg-gray-800 dark:text-gray-200
              "
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
              className="
                w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                text-gray-700 shadow-sm outline-none transition-all
                focus:border-primary-500 focus:ring-2 focus:ring-primary-200
                disabled:cursor-not-allowed disabled:bg-gray-100
                disabled:text-gray-500 dark:border-gray-600
                dark:bg-gray-800 dark:text-gray-200
                dark:focus:border-primary-400
                dark:focus:ring-primary-500/30
              "
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
              className="
                w-full text-sm text-gray-600
                file:mr-4 file:rounded file:border-0
                file:bg-primary-50 file:px-4 file:py-2
                file:text-sm file:font-semibold
                file:text-primary-700 hover:file:bg-primary-100
                dark:file:bg-gray-700 dark:file:text-gray-200
              "
            />

            {pdfFile && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {pdfFile.name}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
              size="sm"
              disabled={loading}
            >
              Cancel
            </Button>

            <Button  disabled={loading} size="sm">
              {loading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}