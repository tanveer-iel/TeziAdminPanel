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
import { toast } from "sonner";

interface Banner {
  id: number | string;
  des: string;
  link: string;
}

interface ModalProps {
  setValue: (value: boolean) => void;
  value: boolean;
}

export default function BannerTable({ value, setValue }: ModalProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);

  // Fetch marketing_banner data
  useEffect(() => {
    async function fetchBanners() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("marketing_banner")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setBanners(data);
      } catch (err) {
        console.error("Error fetching banners:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchBanners();
  }, [value]);

  const handleEdit = (banner: Banner) => {
    setSelectedBanner(banner);
    setEditDesc(banner.des);
    setEditLink(banner.link);
    setEditImage(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBanner) return;

    try {
   
      // Update marketing_banner record
      const { error } = await supabase
        .from("marketing_banner")
        .update({
          des: editDesc,
          link: editLink,
        })
        .eq("id", selectedBanner.id);

      if (error) throw error;

      toast.success("Banner updated successfully");
      setIsEditOpen(false);
      setValue(!value); // trigger refetch in parent
    } catch (err) {
      console.error(err);
      toast.error("Failed to update banner");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading Banners...</div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">{error}</div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">No Banners found.</div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
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
                Link
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
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {banner.des}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {banner.link}
                </TableCell>
                <TableCell className="px-4 py-3 flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => handleEdit(banner)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">
            Update Banner
          </h4>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Input
              type="text"
              defaultValue={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>

          {/* Link */}
          <div>
            <Label>Link</Label>
            <Input
              type="text"
              defaultValue={editLink}
              onChange={(e) => setEditLink(e.target.value)}
            />
          </div>

          {/* Change Image */}
        

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-brand-500 text-white">Update</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}