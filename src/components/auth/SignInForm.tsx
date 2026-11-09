"use client";

// import Checkbox from "@/components/form/input/Checkbox";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import {  EyeCloseIcon, EyeIcon } from "../../icons";
// import Link from "next/link";
import React, { useState, useEffect } from "react";
import supabase from "../../../SupabaseConfig";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInForm({ notice }: { notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Listen to Supabase auth state changes for reliable redirect
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
      
        router.refresh();
        router.push("/"); // layout routes to the first page this role may open 
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Trim email to avoid whitespace issues
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    console.log(data)

    if (signInError) {
      let friendlyMessage = "An error occurred during sign in.";

      if (signInError.message.toLowerCase().includes("invalid login credentials")) {
        friendlyMessage = "Invalid email or password.";
      } else if (signInError.message.toLowerCase().includes("email not confirmed")) {
        friendlyMessage = "Please confirm your email before signing in.";
      } else {
        friendlyMessage = signInError.message;
      }

      setError(friendlyMessage);
      return;
    }

    // On success: the onAuthStateChange listener above will handle the redirect
    // No need to manually redirect here
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      {/* <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to dashboard
        </Link>
      </div> */}

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>

          <div>
            <form onSubmit={handleSignIn}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    placeholder="info@gmail.com"
                    type="email"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      defaultValue={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

                {notice === "password-updated" && !error && (
                  <div className="rounded-lg bg-success-50 px-3 py-2 text-center text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
                    Password updated. Sign in with your new password.
                  </div>
                )}

                {error && (
                  <div className="text-sm text-error-500 text-center">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {/* Uncomment if you want "Keep me logged in" */}
                  {/* <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div> */}

                  <Link
                    href="/forgot-password"
                    className="ml-auto hidden text-sm text-brand-500 hover:text-brand-600 md:inline dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div>
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}