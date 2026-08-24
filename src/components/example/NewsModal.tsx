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

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function NewsModal({ setValue }:ModalProps) {
  const { isOpen, openModal, closeModal } = useModal();

  const [shortDes, setShortDes] = useState("");
  // const [pdfFile, setPdfFile] = useState(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      if (!shortDes || !pdfFile) {
        toast.error("Please fill all fields");
        return;
      }

      setLoading(true);

      // Create unique file name
      const fileName = `${Date.now()}-${pdfFile.name}`;

      // Upload PDF to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("PDF Files")
        .upload(fileName, pdfFile);

      if (uploadError) {
        console.log(uploadError);
        toast.error("PDF upload failed");
        setLoading(false);
        return;
      }

      console.log(uploadData)

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("PDF Files")
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData.publicUrl;

      // Insert into database
      const { error } = await supabase.from("news").insert([
        {
          short_des: shortDes,
          pdf: pdfUrl,
        },
      ]);

      if (error) {
        console.log(error);
        toast.error("Error saving data");
      } else {
        toast.success("News added successfully");

        setShortDes("");
        setPdfFile(null);

        setValue(true); // refresh table
        closeModal();
      }
    } catch (err) {
      console.log(err);
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
        Add News
      </Button>

      <Modal isOpen={isOpen} onClose={closeModal}  className="max-w-[584px] p-5 lg:p-10">
        <form className="space-y-5">
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Add News</h2>

          {/* Short Description */}
          <div>
            <Label>News <span className="text-error-500">*</span></Label>
            <TextArea
              value={shortDes}
              onChange={(value) => setShortDes(value)}
            />
          </div>

          {/* PDF Upload */}
          <div>
            <Label>Upload PDF</Label>
            {/* <input
              type="file"
              defaultValue="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
            /> */}
             <input
              type="file"
              accept="pdf/*"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={loading}
              className="w-full text-[13px] text-gray-600 dark:text-gray-400"
              required
            />
          </div>


          {/* {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )} */}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">


            <Button variant="outline" onClick={closeModal}
              size="sm"
             >
              Cancel
            </Button>
             <Button size="sm" onClick={handleUpload} disabled={loading}>
              {loading ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}