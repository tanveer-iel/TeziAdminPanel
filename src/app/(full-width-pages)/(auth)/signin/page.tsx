import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Tezi Admin",
  description: "Sign in to the Tezi admin panel",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return <SignInForm notice={notice} />;
}
