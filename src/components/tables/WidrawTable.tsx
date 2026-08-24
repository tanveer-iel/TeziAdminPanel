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
}

interface ModalProps {
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
  value: boolean;
}

export default function WindrawTable({ value }: ModalProps) {
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

  // ---------------- FETCH WITHDRAW REQUESTS ----------------
 useEffect(() => {
  async function fetchRequests() {
    try {
      setLoading(true);

      // 1. Get withdraw requests
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
      return "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400";

    case "in_progress":
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";

    case "completed":
      return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400";

    case "cenceled":
      return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";

    default:
      return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
  }
};

  // ---------------- UI STATES ----------------
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading withdrawal requests...
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No withdrawal requests found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
          <TableRow>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User Name</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Client Code</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Bank Name</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">IBAN</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Holder Name</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>

            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created At</TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.username || "-"}</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.clientcode}</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.bank_name}</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.iban}</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.bank_holder_name}</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.amount}</TableCell>
              {/* <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.status}</TableCell> */}
              <TableCell className="px-4 py-3 text-start text-theme-sm">
  <button
  onClick={() => {
    setSelectedRequest(item);
    setSelectedStatus(item.status);
    setStatusModal(true);
  }}
  className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${getStatusStyle(
    item.status
  )}`}
  disabled={item.status === "cenceled" || item.status === "completed"}
>
  {item.status === "in_progress"
    ? "In Progress"
    : item.status === "completed"
    ? "Complete"
    : item.status === "cenceled"
    ? "Cancel"
    : "Pending"}
</button>
</TableCell>
              <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(item.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>


      {statusModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

    <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-900">

      <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white">
        Update Withdraw Status
      </h2>


      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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


      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={() => setStatusModal(false)}
          className="rounded-lg border px-4 py-2 text-gray-600 dark:text-gray-300"
        >
          Cancel
        </button>


        <Button
          onClick={updateStatus}
          disabled={updating}
        >
          {updating ? "Updating..." : "Update"}
        </Button>

      </div>

    </div>

  </div>
)}
    </div>
  );
}