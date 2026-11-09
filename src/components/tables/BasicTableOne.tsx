"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import supabase from "../../../SupabaseConfig";
import { TableSkeleton } from "../ui/skeleton/Skeleton";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import TableSearchBar from "../ui/table/TableSearchBar";
import TableFooter from "../ui/table/TableFooter";
import { useTableSearch } from "../../hooks/useTableSearch";
import { useAdminAccess } from "@/context/AdminAccessContext";

interface Profile {
  id: number | string;         
  email: string;
  username: string;
  account: boolean;
  block: boolean;
  full_name: string;
}

interface ProfileWithCodes extends Profile {
  clientCodes: string[];
}

export default function BasicTableOne() {
  const [profiles, setProfiles] = useState<ProfileWithCodes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { access } = useAdminAccess();
  const isSuper = !!access?.is_super;
  const [updatingId, setUpdatingId] = useState<number | string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    profile: ProfileWithCodes;
    type: "account" | "relink" | "block";
  } | null>(null);

  const PAGE_SIZE = 10;
  const { search, setSearch, page, setPage, totalPages, paginated, filteredCount } =
    useTableSearch(
      profiles,
      (profile, q) =>
        profile.full_name?.toLowerCase().includes(q) ||
        profile.email?.toLowerCase().includes(q) ||
        profile.username?.toLowerCase().includes(q),
      PAGE_SIZE
    );

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, username, account, block, full_name, status")
          .order("id", { ascending: true });

        if (profilesError) throw profilesError;

        // Exclude admin
        const filteredProfiles = (profilesData || []).filter(
          (p) => p.email !== "iel@admin.com"
        );

        // Fetch every customer's client code. The ClientCode table only lets a user read their own row, so
        // staff go through admin_client_codes(): a Super Admin / "users"-menu function that returns
        // (user_id, client_code) only, never the saved trading password.
        const { data: clientCodesData, error: codesError } = await supabase.rpc("admin_client_codes");

        if (codesError) throw codesError;

        // Create a Map: userId (UUID) → list of client codes
        const clientCodeMap = new Map<string, string[]>();

        (clientCodesData || []).forEach((row: { user_id: string; client_code: string }) => {
          if (!clientCodeMap.has(row.user_id)) {
            clientCodeMap.set(row.user_id, []);
          }
          clientCodeMap.get(row.user_id)!.push(row.client_code);
        });

        // Attach client codes to each profile
        // Note: You may need to convert profile.id to string if types don't match
        const enrichedProfiles = filteredProfiles.map((profile) => {
          const profileIdStr = String(profile.id); // Convert to string for safety

          // If your profiles.id is actually UUID, use profile.id directly instead of String(profile.id)
          const userClientCodes = clientCodeMap.get(profileIdStr) || [];

          return {
            ...profile,
            clientCodes: userClientCodes,        // array of strings e.g. ["10020", "IPP2"]
          };
        });

        setProfiles(enrichedProfiles as ProfileWithCodes[]);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Toggle block function remains the same
  const toggleBlockStatus = async (profile: Profile) => {
    const newBlockStatus = !profile.block;

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profile.id ? { ...p, block: newBlockStatus } : p
      )
    );

    setUpdatingId(profile.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ block: newBlockStatus })
        .eq("id", profile.id);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating block status:", err);

      // Revert on error
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, block: profile.block } : p
        )
      );
    } finally {
      setUpdatingId(null);
      setConfirmTarget(null);
    }
  };


  // Super Admin only: restores the Linked state for a customer who still has a saved client code.
  const relinkAccount = async (profile: ProfileWithCodes) => {
    setUpdatingId(profile.id);
    setActionError(null);
    try {
      const { error: fnError } = await supabase.functions.invoke("admin-users", {
        body: { action: "relink", user_id: String(profile.id) },
      });
      if (fnError) {
        let msg = fnError.message;
        try {
          const ctx = (fnError as { context?: Response }).context;
          if (ctx) msg = (await ctx.json())?.error ?? msg;
        } catch { /* keep default message */ }
        throw new Error(msg);
      }
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, account: true } : p)));
    } catch (err) {
      console.error("Re-link error:", err);
      setActionError(err instanceof Error ? err.message : "Could not re-link this account.");
    } finally {
      setUpdatingId(null);
      setConfirmTarget(null);
    }
  };

 const toggleAccountStatus = async (profile: Profile) => {
  const newAccountStatus = !profile.account;

  console.log(
    `Toggling account status for user ${profile.id} to ${newAccountStatus}`
  );

  // Optimistic UI update
  setProfiles((prev) =>
    prev.map((p) =>
      p.id === profile.id
        ? {
            ...p,
            account: newAccountStatus,
            clientCodes: newAccountStatus ? p.clientCodes : [],
          }
        : p
    )
  );

  setUpdatingId(profile.id);

  try {
    console.log("Updating profile...", {
      id: profile.id,
      account: newAccountStatus,
    });

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        account: newAccountStatus,
        status: "unlinked",
      })
      .eq("id", profile.id)
      .select();

    console.log("Profile update response:", profileData);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw profileError;
    }

  const { data, error } = await supabase.functions.invoke(
  "update-user-metadata",
  {
    body: {
      userId: profile.id,
      status: "unlinked",
    },
  }
);

console.log(data, error);
    // If account is being unlinked, remove all client codes
    if (!newAccountStatus) {
      console.log("Deleting ClientCode records...");
      console.log("Searching with userId:", String(profile.id));

      // Check if records exist first
      const { data: existingCodes, error: fetchError } = await supabase
        .from("ClientCode")
        .select("*")
        .eq("userId", String(profile.id));

      console.log("Existing ClientCode records:", existingCodes);

      if (fetchError) {
        console.error("Fetch ClientCode error:", fetchError);
      }

      const { data: deletedData, error: deleteError } = await supabase
        .from("ClientCode")
        .delete()
        .eq("userId", String(profile.id))
        .select();

      console.log("Deleted ClientCode records:", deletedData);

      if (deleteError) {
        console.error("Delete ClientCode error:", deleteError);
        throw deleteError;
      }

      console.log("ClientCode deletion completed successfully.");
    }
  } catch (err) {
    console.error("Toggle account error:", err);

    // Revert on error
    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? (profile as ProfileWithCodes) : p))
    );
  } finally {
    setUpdatingId(null);
    setConfirmTarget(null);
  }
};
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TableSkeleton rows={7} cols={5} />
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
  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-[13px] text-gray-500 dark:border-white/[0.05] dark:bg-white/[0.03]">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <TableSearchBar value={search} onChange={setSearch} placeholder="Search users…" />
      {actionError && (
        <div className="mx-4 mb-2 rounded-lg bg-error-50 px-3 py-2 text-[12.5px] text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {actionError}
        </div>
      )}

      {filteredCount === 0 ? (
        <div className="p-8 text-center text-[13px] text-gray-500">
          No users match your search.
        </div>
      ) : (
      <Table>
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
          <TableRow>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              User
            </TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              Email
            </TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              Account Status
            </TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              User Status
            </TableCell>
            <TableCell isHeader className="px-4 py-2.5 font-semibold text-gray-500 text-start text-[11px] uppercase tracking-wide dark:text-gray-400">
              Client Codes
            </TableCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginated.map((profile) => (
            <TableRow key={profile.id} className="border-b border-gray-100 last:border-0 dark:border-white/[0.04] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
              {/* User */}
              <TableCell className="px-4 py-2.5 text-start">
                <div>
                  <span className="block font-medium text-gray-800 text-[13px] dark:text-white/90">
                    {profile.full_name || "N/A"}
                  </span>
                  <span className="block text-[11.5px] text-gray-400">
                    User ID: {profile.id}
                  </span>
                </div>
              </TableCell>

              {/* Email */}
              <TableCell className="px-4 py-2.5 text-gray-500 text-start text-[12.5px] dark:text-gray-400">
                {profile.email}
              </TableCell>

              {/* Account Status. Rule: an account is Linked only while it has a saved client code. */}
              <TableCell className="px-4 py-2.5 text-start">
                {(() => {
                  const isLinked = profile.account && profile.clientCodes.length > 0;
                  return (
                <button
                  onClick={() =>
                    setConfirmTarget({ profile, type: isLinked ? "account" : "relink" })
                  }
                  disabled={
                    updatingId === profile.id ||
                    (!isLinked && (!isSuper || profile.clientCodes.length === 0 || profile.account))
                  }
                  title={
                    isLinked
                      ? "Unlink this account"
                      : !isSuper
                      ? "Only a Super Admin can re-link"
                      : profile.clientCodes.length === 0
                      ? "No saved client code: the customer must link again from the mobile app"
                      : "Re-link this account"
                  }
                  className={`focus:outline-none transition-all ${
                    updatingId === profile.id
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <Badge size="sm" color={isLinked ? "success" : "error"}>
                    {updatingId === profile.id
                      ? "Updating..."
                      : isLinked
                      ? "Linked"
                      : "Unlinked"}
                  </Badge>
                </button>
                  );
                })()}
              </TableCell>

              {/* User Status */}
              <TableCell className="px-4 py-2.5 text-start">
                <button
                  onClick={() => setConfirmTarget({ profile, type: "block" })}
                  disabled={updatingId === profile.id}
                  className={`focus:outline-none transition-all ${
                    updatingId === profile.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <Badge size="sm" color={profile.block ? "error" : "success"}>
                    {updatingId === profile.id
                      ? "Updating..."
                      : profile.block
                      ? "User Blocked"
                      : "Active User"}
                  </Badge>
                </button>
              </TableCell>

              {/* New Column: Client Codes */}
              <TableCell className="px-4 py-2.5 text-start">
                {profile.clientCodes && profile.clientCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {profile.clientCodes.map((code: string, idx: number) => (
                      <Badge key={idx} size="sm" color="info">
                        {code}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12.5px] text-gray-400">No codes</span>
                )}
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

      <ConfirmDialog
        isOpen={!!confirmTarget}
        variant={
          confirmTarget?.type === "account"
            ? "danger"
            : confirmTarget?.type === "relink"
            ? "default"
            : confirmTarget?.profile.block
            ? "default"
            : "danger"
        }
        title={
          confirmTarget?.type === "account"
            ? "Unlink this account?"
            : confirmTarget?.type === "relink"
            ? "Re-link this account?"
            : confirmTarget?.profile.block
            ? "Unblock this user?"
            : "Block this user?"
        }
        description={
          confirmTarget
            ? confirmTarget.type === "account"
              ? `This will unlink "${confirmTarget.profile.full_name || confirmTarget.profile.email}" and permanently delete their saved client code and trading password. They would have to link again from the mobile app. This cannot be undone.`
              : confirmTarget.type === "relink"
              ? `This will mark "${confirmTarget.profile.full_name || confirmTarget.profile.email}" as linked again, using the client code they still have saved (${confirmTarget.profile.clientCodes.join(", ")}).`
              : confirmTarget.profile.block
              ? `This will unblock "${confirmTarget.profile.full_name || confirmTarget.profile.email}", allowing them to sign in again.`
              : `This will block "${confirmTarget.profile.full_name || confirmTarget.profile.email}" from signing in.`
            : undefined
        }
        confirmLabel={
          confirmTarget?.type === "account"
            ? "Unlink"
            : confirmTarget?.type === "relink"
            ? "Re-link"
            : confirmTarget?.profile.block
            ? "Unblock"
            : "Block"
        }
        requireText={confirmTarget?.type === "account" ? confirmTarget.profile.email : undefined}
        loading={!!confirmTarget && updatingId === confirmTarget.profile.id}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          const { profile, type } = confirmTarget;
          if (type === "account") {
            toggleAccountStatus(profile);
          } else if (type === "relink") {
            relinkAccount(profile);
          } else {
            toggleBlockStatus(profile);
          }
        }}
      />
    </div>
  );
}