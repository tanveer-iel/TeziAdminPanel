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
import supabase from "../../../SupabaseConfig";
import { toast } from "sonner";
import { Modal } from "../ui/modal";
import Label from "../form/Label";

interface Sector {
  id: number | string;
  sector_name: string;
  created_at: string;
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

export default function IELSectorTable({ value, setValue }: ModalProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [editSectorName, setEditSectorName] = useState("");

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
          .from("sector_iel")
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
    const confirmDelete = confirm("Are you sure you want to delete this sector?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("sector_iel").delete().eq("id", id);

      if (error) throw error;

      setSectors((prev) => prev.filter((item) => item.id !== id));
      toast.success("Sector deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete sector");
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
        .from("sector_iel")
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
    return <div className="p-8 text-center text-gray-500">Loading sectors...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (sectors.length === 0) {
    return <div className="p-8 text-center text-gray-500">No sectors found.</div>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Sector Name
                </TableCell>

                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Created At
                </TableCell>

                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {sectors.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {item.sector_name}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {formatDate(item.created_at)}
                  </TableCell>

                  <TableCell className="px-4 py-3 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleDelete(item.id)}
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

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        className="max-w-[584px] p-5 lg:p-10"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-500 text-start dark:text-gray-400">
            Update Sector
          </h4>

          <div>
            <Label>Sector Name</Label>
            <input
              type="text"
              value={editSectorName}
              onChange={(e) => setEditSectorName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline"  onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>

            <Button className="bg-brand-500 text-white">
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}