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
import Badge from "../ui/badge/Badge";
import { TableSkeleton } from "../ui/skeleton/Skeleton";

interface WithdrawRequest {
  id: number | string;
  user_id: string;
  clientcode: string;
  iban: string;
  bank_name: string;
  amount: number;
  bank_holder_name: string;
  status:string;
  created_at: string;
 username?: string; //
 request_id:string;
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

export default function WithdrawalRequestsTable({ value }: ModalProps) {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState(false);
const [selectedRequest, setSelectedRequest] =
  useState<WithdrawRequest | null>(null);
const [selectedStatus, setSelectedStatus] = useState("");
const [updating, setUpdating] = useState(false);

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

  // ---------------- FETCH WITHDRAWAL REQUESTS ----------------
 useEffect(() => {
  async function fetchRequests() {
    try {
      setLoading(true);

      // 1. Get withdrawal requests
      const { data: requestsData, error: reqError } = await supabase
        .from("widrawrequest")
        .select("*")
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // 2. Get all profiles
      const { data: profilesData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profileError) throw profileError;

      // 3. Map profiles by id for fast lookup
      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, p.full_name])
      );

      // 4. Merge username into requests
      const merged = (requestsData || []).map((req) => ({
        ...req,
        username: profileMap.get(req.user_id) || "-",
      }));

      setRequests(merged);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to load withdrawal requests.");
    } finally {
      setLoading(false);
    }
  }

  fetchRequests();
}, [value]);


const updateStatus = async () => {
  if (!selectedRequest) return;

  try {
    setUpdating(true);

    const { error } = await supabase
      .from("widrawrequest")
      .update({
        status: selectedStatus,
      })
      .eq("id", selectedRequest.id);

    if (error) throw error;

    toast.success("Status updated successfully");

    setRequests((prev) =>
      prev.map((item) =>
        item.id === selectedRequest.id
          ? { ...item, status: selectedStatus }
          : item
      )
    );

    setStatusModal(false);
    setSelectedRequest(null);

  } catch (error) {
    console.error(error);
    toast.error("Failed to update status");
  } finally {
    setUpdating(false);
  }
};


const getStatusStyle = (status: string) => {
  switch (status) {
    case "pending":
      return "warning";

    case "in_progress":
      return "info";

    case "completed":
      return "success";

    case "cenceled":
      return "error";

    default:
      return "light";
  }
};

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={8} />
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

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No withdrawal requests found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <Table>
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Request ID</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">User Name</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Client Code</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Bank Name</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">IBAN</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Holder Name</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Amount</TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Status</TableCell>

            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">Created At</TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.map((item) => (
            <TableRow key={item.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
              <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">{item.request_id || "-"}</TableCell>
              <TableCell className="px-4 py-2.5 font-medium text-gray-800 text-start text-[13px] dark:text-white/90">{item.username || "-"}</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{item.clientcode}</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{item.bank_name}</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{item.iban}</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{item.bank_holder_name}</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{item.amount}</TableCell>
              <TableCell className="px-4 py-2.5 text-start text-[13px]">
  <button
  onClick={() => {
    setSelectedRequest(item);
    setSelectedStatus(item.status);
    setStatusModal(true);
  }}
  disabled={item.status === "cenceled" || item.status === "completed"}
>
  <Badge color={getStatusStyle(item.status)} size="sm">
    {item.status === "in_progress"
      ? "In Progress"
      : item.status === "completed"
      ? "Complete"
      : item.status === "cenceled"
      ? "Cancel"
      : "Pending"}
  </Badge>
</button>
</TableCell>
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">{formatDate(item.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>


      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        className="max-w-[400px] p-5"
      >
        <h4 className="text-[15px] font-semibold text-gray-800 dark:text-white/90">
          Update Withdrawal Status
        </h4>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="mt-4 h-9 w-full rounded-md border border-gray-300 px-3 text-[13px] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >

          <option value="pending">
            Pending
          </option>

          <option value="in_progress">
            In Progress
          </option>

          <option value="completed">
            Complete
          </option>

          <option value="cenceled">
            Cancel
          </option>

        </select>

        <div className="mt-5 flex justify-end gap-2">

          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusModal(false)}
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={updateStatus}
            disabled={updating}
          >
            {updating ? "Updating..." : "Update"}
          </Button>

        </div>
      </Modal>
    </div>
  );
}
