"use client";

import React, { useEffect, useState } from "react";
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
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import Label from "../form/Label";
import { TableSkeleton } from "../ui/skeleton/Skeleton";

interface Sector {
  id: number | string;
  sector_name: string;
  created_at: string;
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

export default function SectorTable({ value, setValue }: ModalProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [editSectorName, setEditSectorName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Sector | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date.replace(" ", "T")));
  };

  useEffect(() => {
    async function fetchSectors() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("sector")
          .select("id, sector_name, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setSectors(data || []);
      } catch (err) {
        console.error("Error fetching sectors:", err);
        setError("Failed to load sectors. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchSectors();
  }, [value]);

  const handleDelete = async (id: number | string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("sector").delete().eq("id", id);

      if (error) throw error;

      setSectors((prev) => prev.filter((item) => item.id !== id));
      toast.success("Sector deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete sector");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = (sector: Sector) => {
    setSelectedSector(sector);
    setEditSectorName(sector.sector_name);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSector) return;

    try {
      const { error } = await supabase
        .from("sector")
        .update({
          sector_name: editSectorName,
        })
        .eq("id", selectedSector.id);

      if (error) throw error;

      toast.success("Sector updated successfully");

      setIsEditOpen(false);
      setSelectedSector(null);
      setEditSectorName("");
      setValue(!value);
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update sector");
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

  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No sectors found.
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
                Sector Name
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
                Created At
              </TableCell>

              <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-end text-[11px] uppercase tracking-wide dark:text-gray-400">
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sectors.map((item) => (
              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">
                  {item.sector_name}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                  {formatDate(item.created_at)}
                </TableCell>

                <TableCell className="px-4 py-2.5 text-end">
                  <div className="inline-flex items-center gap-1">
                    <IconButton title="Edit" onClick={() => handleEdit(item)}>
                      <PencilIcon />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      variant="danger"
                      onClick={() => setDeleteTarget(item)}
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
        className="max-w-[440px] p-5"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">Update Sector</h4>

          <div>
            <Label>Sector Name</Label>
            <input
              type="text"
              value={editSectorName}
              onChange={(e) => setEditSectorName(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
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
        title="Delete sector?"
        description={deleteTarget ? `This will permanently remove "${deleteTarget.sector_name}".` : undefined}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </>
  );
}
