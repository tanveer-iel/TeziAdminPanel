import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Tezi Admin",
  description: "Sign up for the Tezi admin panel",
};

export default function SignUp() {
  return <SignUpForm />;
}
