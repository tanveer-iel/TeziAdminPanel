"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
// import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
// import Input from "../form/input/InputField";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner"; // Optional: for nice notifications (recommended)
import TextArea from "../form/input/TextArea";

interface Profile {
  id:  number| string;
  short_des:  string;
  pdf: string;
 
}

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}
export default function NewsTable({value, setValue}:ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<Profile | null>(null);
  
  const [editshortdesc, seteditshortdesc] = useState("");
  const [editpdf, seteditpdf] = useState<File | null>(null);;

  useEffect(() => {
    async function fetchBlogs() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("news")
          .select("*")
           .order("created_at", { ascending: false }); 

        if (error) throw error;

     

        setBlogsData(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, [value]);



    const handleDelete = async (id: number | string) => {
      const confirmDelete = confirm("Are you sure you want to delete this record?");
      if (!confirmDelete) return;
  
      try {
        const { error } = await supabase
          .from("news")
          .delete()
          .eq("id", id);
  
        if (error) throw error;
  
        setBlogsData((prev) => prev.filter((item) => item.id !== id));
  
        toast.success("Record deleted successfully");
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete record");
      }
    };


      const handleEdit = (blog: Profile) => {
  setSelectedNews(blog);
  seteditshortdesc(blog.short_des);
  setIsEditOpen(true);
};


const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedNews) return;

  try {
    let pdfUrl = selectedNews.pdf;

    /* If user selected new image */
    if (editpdf) {
      const fileName = `${Date.now()}-${editpdf.name}`;

      const { error: uploadError } = await supabase.storage
        .from("PDF Files")
        .upload(fileName, editpdf);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("PDF Files")
        .getPublicUrl(fileName);

      pdfUrl = data.publicUrl;
    }

    /* Update News record */

    const { error } = await supabase
      .from("news")
      .update({
        short_des: editshortdesc,
        pdf: pdfUrl,
      })
      .eq("id", selectedNews.id);

    if (error) throw error;

    toast.success("News updated successfully");

    setIsEditOpen(false);
    setValue(!value);

  } catch (err) {
    console.error(err);
    toast.error("Failed to update News");
  }
};
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading News...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (BlogsData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No News found.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="w-full">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
           
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  News
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  PDF
                </TableCell>

                 <TableCell
                               isHeader
                               className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                             >
                               Action
                             </TableCell>

               
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {BlogsData.map((items) => (
                <TableRow key={items.id}>
                 
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    
                    {items.short_des}
                    
                  </TableCell>
                 

                 <TableCell className="px-4 py-3 text-start text-theme-sm">
  <Button
   size="sm"
    onClick={() => window.open(items.pdf, "_blank")}
    className=" text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-200 min-w-max"
  >
    Open PDF
  </Button>
</TableCell>

   <TableCell className="px-4 py-3 flex gap-2">
                        <Button
  size="sm"
  className="bg-blue-500 hover:bg-blue-600 text-white"
  onClick={() => handleEdit(items)}
>
  Edit
</Button>
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => handleDelete(items.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
                 
                            
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>


 <Modal
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  className="max-w-[584px] p-5 lg:p-10"
>
  <form onSubmit={handleUpdate} className="space-y-6">

    <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">Update News</h4>

    {/* Title */}
    <div>
      <Label>News</Label>
      {/* <Input
        type="text"
        defaultValue={editshortdesc}
        onChange={(e) => seteditshortdesc(e.target.value)}
      /> */}
       <TextArea
              value={editshortdesc}
              onChange={(value) => seteditshortdesc(value)}
            />
    </div>

   

   
    {/* New Image */}
    <div>
      <Label>Upload PDF</Label>
        <input
              type="file"
              accept="pdf/*"
              onChange={(e) => seteditpdf(e.target.files?.[0] || null)}
              disabled={loading}
              className="w-full text-sm text-gray-600"
            />
    </div>

    <div className="flex justify-end gap-3">

      <Button
        variant="outline"
        onClick={() => setIsEditOpen(false)}
      >
        Cancel
      </Button>

      <Button
        className="bg-brand-500 text-white"
      >
        Update
      </Button>

    </div>

  </form>
</Modal>
    </>
  );
}