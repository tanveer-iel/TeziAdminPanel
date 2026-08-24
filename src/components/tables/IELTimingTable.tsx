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

interface IELTiming {
  id: number | string | null;
  day: string;
  status: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function IELTimingTable({ value, setValue }: ModalProps) {
  const [timings, setTimings] = useState<IELTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTiming, setSelectedTiming] = useState<IELTiming | null>(null);

  const [editDay, setEditDay] = useState("");
  const [editStatus, setEditStatus] = useState(false);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editBreakStartTime, setEditBreakStartTime] = useState("");
  const [editBreakEndTime, setEditBreakEndTime] = useState("");
  const [updating, setUpdating] = useState(false);

  // Convert Supabase TIME "09:30:00" -> input TIME "09:30"
  const formatTimeForInput = (time: string | null) => {
    if (!time) return "";

    return time.length >= 5 ? time.substring(0, 5) : time;
  };

  // Convert input TIME "09:30" -> Supabase TIME "09:30:00"
  const formatTimeForDatabase = (time: string) => {
    if (!time) return null;

    if (time.length === 5) {
      return `${time}:00`;
    }

    return time;
  };

  // ---------------- FETCH TIMINGS ----------------
  useEffect(() => {
    async function fetchTimings() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("iel_timing")
          .select(
            "id, day, status, start_time, end_time, break_start_time, break_end_time, created_at, updated_at"
          );

        if (error) throw error;

        const fetchedData = data || [];

        // Make sure Monday-Sunday are always shown
        const orderedTimings: IELTiming[] = DAYS.map((day) => {
          const existing = fetchedData.find(
            (item: IELTiming) => item.day === day
          );

          if (existing) {
            return existing;
          }

          return {
            id: null,
            day,
            status: false,
            start_time: null,
            end_time: null,
            break_start_time: null,
            break_end_time: null,
          };
        });

        setTimings(orderedTimings);
      } catch (err) {
        console.error("Error fetching IEL timings:", err);
        setError("Failed to load IEL timings. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchTimings();
  }, [value]);

  // ---------------- EDIT ----------------
  const handleEdit = (item: IELTiming) => {
    setSelectedTiming(item);

    setEditDay(item.day);
    setEditStatus(item.status ?? false);
    setEditStartTime(formatTimeForInput(item.start_time));
    setEditEndTime(formatTimeForInput(item.end_time));
    setEditBreakStartTime(formatTimeForInput(item.break_start_time));
    setEditBreakEndTime(formatTimeForInput(item.break_end_time));

    setIsEditOpen(true);
  };

  // ---------------- UPDATE / INSERT ----------------
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTiming) return;

    try {
      setUpdating(true);

      const payload = {
        day: editDay,
        status: editStatus,
        start_time: formatTimeForDatabase(editStartTime),
        end_time: formatTimeForDatabase(editEndTime),
        break_start_time: formatTimeForDatabase(editBreakStartTime),
        break_end_time: formatTimeForDatabase(editBreakEndTime),
        updated_at: new Date().toISOString(),
      };

      // If row exists -> UPDATE
      if (selectedTiming.id !== null) {
        const { error } = await supabase
          .from("iel_timing")
          .update(payload)
          .eq("id", selectedTiming.id);

        if (error) throw error;

        toast.success(`${editDay} timing updated successfully`);
      } else {
        // If row doesn't exist -> INSERT
        const { error } = await supabase
          .from("iel_timing")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast.success(`${editDay} timing added successfully`);
      }

      setIsEditOpen(false);
      setSelectedTiming(null);

      // Refresh table
      setValue((prev) => !prev);
    } catch (err) {
      console.error("Timing update error:", err);
      toast.error("Failed to save timing");
    } finally {
      setUpdating(false);
    }
  };

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading IEL timings...
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

  return (
    <>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Day
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Start Time
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                End Time
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Break Start
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Break End
              </TableCell>

              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {timings.map((item) => (
              <TableRow key={item.day}>
                {/* Day */}
                <TableCell className="px-4 py-3 font-medium text-gray-700 text-start text-theme-sm dark:text-gray-300">
                  {item.day}
                </TableCell>

                {/* Status */}
                <TableCell className="px-4 py-3 text-start text-theme-sm">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      item.status
                        ? "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                        : "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    }`}
                  >
                    {item.status ? "Open" : "Closed"}
                  </span>
                </TableCell>

                {/* Start */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.start_time ? formatTimeForInput(item.start_time) : "-"}
                </TableCell>

                {/* End */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.end_time ? formatTimeForInput(item.end_time) : "-"}
                </TableCell>

                {/* Break Start */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.break_start_time
                    ? formatTimeForInput(item.break_start_time)
                    : "-"}
                </TableCell>

                {/* Break End */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {item.break_end_time
                    ? formatTimeForInput(item.break_end_time)
                    : "-"}
                </TableCell>

                {/* Action */}
                <TableCell className="px-4 py-3">
                  <Button
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-600"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
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
        className="max-w-[584px] p-5 lg:p-10 mt-28"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Update IEL Timing
          </h4>

          {/* Day */}
          <div>
            <Label>Day</Label>

            <select
              value={editDay}
              onChange={(e) => setEditDay(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={editStatus}
                onChange={(e) => setEditStatus(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300"
              />

              <span className="text-sm text-gray-700 dark:text-gray-300">
                {editStatus ? "Open" : "Closed"}
              </span>
            </label>
          </div>

          {/* Start Time */}
          <div>
            <Label>Start Time</Label>

            <input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              required={editStatus}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* End Time */}
          <div>
            <Label>End Time</Label>

            <input
              type="time"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
              required={editStatus}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Break Start */}
          <div>
            <Label>Break Start Time</Label>

            <input
              type="time"
              value={editBreakStartTime}
              onChange={(e) => setEditBreakStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Break End */}
          <div>
            <Label>Break End Time</Label>

            <input
              type="time"
              value={editBreakEndTime}
              onChange={(e) => setEditBreakEndTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>

            <Button
              className="bg-brand-500 text-white"
              disabled={updating}
            >
              {updating ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}