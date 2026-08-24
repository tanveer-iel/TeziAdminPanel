"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import supabase from "../../../SupabaseConfig";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      // ✅ Only redirect if not already on /Users
      if (pathname === "/") {
        router.replace("/Users");
      }
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

  // ⏳ Prevent UI flicker before auth check
if (loading) {
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