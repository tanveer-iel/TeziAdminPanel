"use client";

import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import supabase from "../../../SupabaseConfig";
import { useRouter } from "next/navigation";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The link in the email opens this page with a one-time token. The Supabase client reads it from the
  // address, signs the person in with a short "recovery" session and fires PASSWORD_RECOVERY.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setStatus("ready");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });
    // No session after a few seconds: the link is missing, used or expired.
    const timer = setTimeout(() => setStatus((s) => (s === "checking" ? "invalid" : s)), 4000);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // End the recovery session so the person signs in again with the new password.
    await supabase.auth.signOut();
    router.replace("/signin?notice=password-updated");
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Set a new password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose a password with at least 8 characters.</p>
        </div>

        {status === "checking" && <p className="text-sm text-gray-500 dark:text-gray-400">Checking your link...</p>}

        {status === "invalid" && (
          <div className="space-y-5">
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              This reset link is invalid or has expired. Links work once. Request a new one.
            </div>
            <Link href="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Request a new link
            </Link>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  New password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    placeholder="New password"
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShow(!show)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {show ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <Label>
                  Confirm password <span className="text-error-500">*</span>
                </Label>
                <Input
                  type={show ? "text" : "password"}
                  placeholder="Repeat the password"
                  defaultValue={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-error-500 text-center">{error}</div>}

              <Button className="w-full" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save new password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
