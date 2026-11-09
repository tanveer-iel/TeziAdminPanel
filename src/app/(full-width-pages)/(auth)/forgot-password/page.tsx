import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Tezi Admin",
  description: "Request a password reset link for the Tezi admin panel",
};

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
