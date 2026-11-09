"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import supabase from "../../../SupabaseConfig";
import { Modal } from "../ui/modal";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { MENUS } from "@/lib/adminMenus";

type Role = { role: string; label: string; menus: string[]; is_system: boolean };
type AdminUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

const field =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-[13px] text-gray-800 dark:border-gray-700 dark:text-white/90";
const btn = "rounded-lg px-3 py-1.5 text-[12.5px] font-medium";
const btnPrimary = `${btn} bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50`;
const btnOutline = `${btn} border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300`;

async function callAdminFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json()).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminUsersManager() {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, u] = await Promise.all([
      supabase.from("admin_roles").select("*").order("created_at"),
      supabase.from("admin_users").select("*").order("created_at"),
    ]);
    if (r.error) toast.error(r.error.message);
    if (u.error) toast.error(u.error.message);
    setRoles((r.data as Role[]) ?? []);
    setUsers((u.data as AdminUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const roleLabel = (key: string) => roles.find((r) => r.role === key)?.label ?? key;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {(["users", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${
              tab === t
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500"
            }`}
          >
            {t === "users" ? "Users" : "Roles & menus"}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tab === "users" ? (
        <UsersTab users={users} roles={roles} roleLabel={roleLabel} reload={load} />
      ) : (
        <RolesTab roles={roles} reload={load} />
      )}
    </div>
  );
}

/* ---------------------------------- Users --------------------------------- */

function UsersTab({
  users,
  roles,
  roleLabel,
  reload,
}: {
  users: AdminUser[];
  roles: Role[];
  roleLabel: (k: string) => string;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const open = (u: AdminUser | "new") => {
    setEditing(u);
    if (u === "new") {
      setEmail("");
      setName("");
      setPassword("");
      setPhone("");
      setRole(roles.find((r) => !r.is_system)?.role ?? "");
      setActive(true);
    } else {
      setEmail(u.email);
      setName(u.full_name ?? "");
      setPassword("");
      setPhone("");
      setRole(u.role);
      setActive(u.active);
      supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", u.user_id)
        .maybeSingle()
        .then(({ data }) => setPhone(data?.phone_number ? String(data.phone_number) : ""));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing === "new") {
        await callAdminFn({ action: "create", email, full_name: name, password, role });
        toast.success("User created");
      } else if (editing) {
        await callAdminFn({
          action: "update",
          user_id: editing.user_id,
          full_name: name,
          phone,
          role,
          active,
          ...(password ? { password } : {}),
        });
        toast.success("User updated");
      }
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await callAdminFn({ action: "delete", user_id: deleting.user_id });
      toast.success("User deleted");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] text-gray-500">
          tanveer@iel.net.pk is always a Super Admin.
        </p>
        <button className={btnPrimary} onClick={() => open("new")}>
          + Add user
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2">Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="text-gray-800 dark:text-white/90">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No panel users yet. Click “Add user”.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.user_id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2">{u.email}</td>
                <td>{u.full_name ?? "—"}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{u.active ? "Active" : "Disabled"}</td>
                <td className="space-x-2 text-right">
                  <button className={btnOutline} onClick={() => open(u)}>
                    Edit
                  </button>
                  <button className={btnOutline} onClick={() => setDeleting(u)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} className="max-w-md p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-gray-800 dark:text-white/90">
          {editing === "new" ? "Add user" : "Edit user"}
        </h2>
        <div className="space-y-3">
          <input
            className={field}
            placeholder="Email"
            type="email"
            value={email}
            disabled={editing !== "new"}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={field}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {editing !== "new" && (
            <input
              className={field}
              placeholder="Phone (digits, e.g. 923001234567)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
          <input
            className={field}
            type="password"
            autoComplete="new-password"
            placeholder={editing === "new" ? "Password (blank if they already have an account)" : "New password (leave blank to keep)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>
          {editing !== "new" && (
            <label className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active (can sign in)
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className={btnOutline} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className={btnPrimary} disabled={saving || !role} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete user"
        description={`Delete ${deleting?.email}? Their login is removed permanently.`}
      />
    </>
  );
}

/* ---------------------------------- Roles --------------------------------- */

function RolesTab({ roles, reload }: { roles: Role[]; reload: () => Promise<void> }) {
  const [selected, setSelected] = useState<string>(roles.find((r) => !r.is_system)?.role ?? "");
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const current = roles.find((r) => r.role === selected);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft with the chosen role
    setDraft(current?.menus ?? []);
  }, [current]);

  const toggle = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_roles").update({ menus: draft }).eq("role", selected);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Role saved. Users see the change on next page load.");
    await reload();
  };

  const create = async () => {
    const { error } = await supabase
      .from("admin_roles")
      .insert({ role: newKey.trim().toLowerCase(), label: newLabel.trim(), menus: [] });
    if (error) return toast.error(error.message);
    toast.success("Role created");
    setSelected(newKey.trim().toLowerCase());
    setNewKey("");
    setNewLabel("");
    await reload();
  };

  const groups = Array.from(new Set(MENUS.map((m) => m.group)));

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="space-y-2">
        {roles.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelected(r.role)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] ${
              selected === r.role
                ? "bg-brand-50 text-brand-600"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300"
            }`}
          >
            {r.label}
            {r.is_system && <span className="ml-1 text-[11px] text-gray-400">(all menus)</span>}
          </button>
        ))}
        <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <input className={field} placeholder="key (e.g. support)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <input className={field} placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <button className={btnOutline} disabled={!newKey || !newLabel} onClick={create}>
            + New role
          </button>
        </div>
      </div>

      <div>
        {!current ? null : current.is_system ? (
          <p className="text-[13px] text-gray-500">Super Admin always has every menu plus this page.</p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g} className="mb-4">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{g}</h3>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {MENUS.filter((m) => m.group === g).map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-[13px] text-gray-800 dark:text-white/90">
                      <input type="checkbox" checked={draft.includes(m.key)} onChange={() => toggle(m.key)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className={btnPrimary} disabled={saving} onClick={save}>
              {saving ? "Saving…" : `Save ${current.label}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
