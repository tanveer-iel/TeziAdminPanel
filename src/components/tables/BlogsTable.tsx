"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner"; // Optional: for nice notifications (recommended)

interface Profile {
  id:  number| string;
  title:  string;
  img: string;
  desc: string;
 
}

interface ModalProps {
  setValue: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
  value: (value: boolean) => void;   // or React.Dispatch<React.SetStateAction<boolean>>
}

export default function BlogsTable({value,setValue}:ModalProps) {
  const [BlogsData, setBlogsData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
const [selectedBlog, setSelectedBlog] = useState<Profile | null>(null);

const [editTitle, setEditTitle] = useState("");
const [editDesc, setEditDesc] = useState("");
const [editImage, setEditImage] = useState<File | null>(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("blogs")
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
        .from("blogs")
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
  setSelectedBlog(blog);
  setEditTitle(blog.title);
  setEditDesc(blog.desc);
  setEditImage(null);
  setIsEditOpen(true);
};


const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedBlog) return;

  try {
    let imageUrl = selectedBlog.img;

    /* If user selected new image */
    if (editImage) {
      const fileName = `${Date.now()}-${editImage.name}`;

      const { error: uploadError } = await supabase.storage
        .from("Images")
        .upload(fileName, editImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("Images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    /* Update blog record */

    const { error } = await supabase
      .from("blogs")
      .update({
        title: editTitle,
        desc: editDesc,
        img: imageUrl,
      })
      .eq("id", selectedBlog.id);

    if (error) throw error;

    toast.success("Blog updated successfully");

    setIsEditOpen(false);
    setValue(!value);

  } catch (err) {
    console.error(err);
    toast.error("Failed to update blog");
  }
};

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Blogs...
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
        No Blogs found.
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
                  Image
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Title
                </TableCell>

                  <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                 Description
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
                    
                    <div>
                        <img src= {items.img} alt="" className="w-[200px] h-[120px]"/>
                    </div>
                    
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.title}
                  </TableCell>   
                   <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.desc}
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

    <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">Update Blog</h4>

    {/* Title */}
    <div>
      <Label>Title</Label>
      <Input
        type="text"
        defaultValue={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
      />
    </div>

    {/* Description */}
    <div>
      <Label>Description</Label>
      <Input
        defaultValue={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
      />
    </div>

    {/* Current Image
    {selectedBlog && (
      <div>
        <Label>Current Image</Label>
        <img
          src={selectedBlog.img}
          className="w-[200px] rounded-lg mt-2"
        />
      </div>
    )} */}

    {/* New Image */}
    <div>
      <Label>Change Image</Label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setEditImage(e.target.files?.[0] || null)}
        className="text-gray-600"
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