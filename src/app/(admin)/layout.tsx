"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import supabase from "../../../SupabaseConfig";
import { AdminAccessProvider, useAdminAccess } from "@/context/AdminAccessContext";
import { ADMIN_USERS_PATH, canAccessPath, homePath } from "@/lib/adminMenus";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAccessProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { access, loading: accessLoading, error: accessError } = useAdminAccess();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  // Dynamic class for main content margin
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[236px]"
    : "lg:ml-[76px]";

useEffect(() => {
  let isMounted = true;

  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!isMounted) return;

    if (!session) {
      router.replace("/signin");
    } else {
    }

      setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 2000);
  }

  checkAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      router.replace("/signin");
    }
  });

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, [router, pathname]);

  // Role-based routing: send people to their first permitted page, block the rest.
  const denied =
    !!access?.role &&
    (pathname === "/" ||
      (pathname.toLowerCase() === ADMIN_USERS_PATH.toLowerCase() && !access.is_super) ||
      !canAccessPath(access, pathname));
  useEffect(() => {
    if (!accessLoading && denied) router.replace(homePath(access));
  }, [accessLoading, denied, access, router]);

  if (!loading && !accessLoading && (accessError || (access && !access.role))) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow">
          <h1 className="mb-2 text-lg font-semibold text-gray-800">No access</h1>
          <p className="mb-4 text-sm text-gray-600">
            {accessError ??
              "This account has not been given access to the admin panel. Ask the Super Admin to add you."}
          </p>
          <button
            className="rounded bg-brand-500 px-4 py-2 text-sm text-white"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/signin");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ⏳ Prevent UI flicker before auth check
if (loading || accessLoading || denied) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

        {/* Text */}
        <p className="text-gray-600 text-sm font-medium">
          Checking authentication...
        </p>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}