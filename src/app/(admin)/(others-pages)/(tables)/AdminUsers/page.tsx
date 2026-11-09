import AdminUsersManager from "@/components/admin/AdminUsersManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Admin Users & Roles",
  description: "Create panel users and choose which menus each role can open",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/90">
        Admin Users &amp; Roles
      </h1>
      <AdminUsersManager />
    </div>
  );
}
