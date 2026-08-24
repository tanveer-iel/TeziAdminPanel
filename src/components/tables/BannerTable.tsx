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
import { PencilIcon } from "../ui/button/icons";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";

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

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      banners,
      (banner, q) => banner.des?.toLowerCase().includes(q),
      PAGE_SIZE
    );

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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={3} />
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

  if (banners.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No Banners found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search banners…" />

        {filteredCount === 0 ? (
          <div className="p-8 text-center text-[13px] text-gray-500">
            No banners match your search.
          </div>
        ) : (
        <Table>
          <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <TableRow>
              <TableCell
                isHeader
                className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
              >
                Description
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400"
              >
                Link
              </TableCell>
              <TableCell
                isHeader
                className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((banner) => (
              <TableRow
                key={banner.id}
                className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
              >
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {banner.des}
                </TableCell>
                <TableCell className="px-4 py-2.5 max-w-xs text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  <span className="block truncate" title={banner.link}>
                    {banner.link}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(banner)}>
                      <PencilIcon />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}

        <TableFooter
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalCount={filteredCount}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[440px] p-5"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
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


          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm">Update</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}