"use client";

import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Link from "next/link";
import React, { useState } from "react";
import supabase from "../../../SupabaseConfig";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);

    // The check "is this a panel user?" happens on the server, because the same Supabase accounts are
    // also used by the mobile app and only panel users may use this page.
    const { data, error: fnError } = await supabase.functions.invoke("panel-password-reset", {
      body: { email: address, redirectTo: `${window.location.origin}/reset-password` },
    });
    setLoading(false);

    if (fnError || !data) {
      setError("Something went wrong. Please try again in a moment.");
      return;
    }
    if (!data.ok) {
      setError(
        data.reason === "not_panel"
          ? "We couldn't find a panel user with the provided email."
          : data.reason === "rate_limited"
          ? "Too many requests. Please wait a few minutes and try again."
          : data.reason === "bad_email"
          ? "Enter a valid email address."
          : "Something went wrong. Please try again in a moment."
      );
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Forgot password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the email you use for this panel and we will send you a link to set a new password.
          </p>
        </div>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
              A reset link is on its way to your email. It can take a few
              minutes and expires after a while. Check your spam folder too.
            </div>
            <Link href="/signin" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder="you@iel.net.pk"
                  type="email"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-error-500 text-center">{error}</div>}

              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link href="/signin" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Back to sign in
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
