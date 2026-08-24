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
import IconButton from "../ui/button/IconButton";
import { PencilIcon, TrashIcon } from "../ui/button/icons";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner"; // Optional: for nice notifications (recommended)
import { TableSkeleton } from "../ui/skeleton/Skeleton";

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

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setDeleting(true);
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
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-error-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {error}
      </div>
    );
  }

  if (BlogsData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Blogs found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Image
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Title
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Description
              </TableCell>
              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {BlogsData.map((items) => (
              <TableRow key={items.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 text-start">
                  <img
                    src={items.img}
                    alt=""
                    className="h-8 w-8 rounded-md object-cover border border-gray-100 dark:border-white/[0.05]"
                  />
                </TableCell>
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {items.title}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  <span className="line-clamp-2 max-w-sm">{items.desc}</span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(items)}>
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      variant="danger"
                      onClick={() => setDeleteTarget(items)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ---------------- EDIT MODAL ---------------- */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-5">

          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Update Blog</h4>

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
              className="text-[13px] text-gray-600"
            />
          </div>

          <div className="flex justify-end gap-2">

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>

            <Button size="sm">
              Update
            </Button>

          </div>

        </form>
      </Modal>

      {/* ---------------- DELETE CONFIRM ---------------- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete blog?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.title}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
