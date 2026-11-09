"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import supabase from "../../SupabaseConfig";
import type { Access } from "@/lib/adminMenus";

type Ctx = {
  access: Access | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const AdminAccessContext = createContext<Ctx>({
  access: null,
  loading: true,
  error: null,
  reload: async () => {},
});

export const useAdminAccess = () => useContext(AdminAccessContext);

export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setAccess(null);
      setLoading(false);
      return;
    }
    const { data, error: rpcErr } = await supabase.rpc("get_my_access");
    if (rpcErr) {
      setError(
        rpcErr.message +
          " (has supabase/sql/admin-roles/20261108000000_admin_roles.sql been run?)"
      );
      setAccess(null);
    } else {
      setError(null);
      setAccess(data as Access);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load of access data
    reload();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") reload();
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  return (
    <AdminAccessContext.Provider value={{ access, loading, error, reload }}>
      {children}
    </AdminAccessContext.Provider>
  );
}
