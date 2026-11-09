import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Tezi Admin",
  description: "Set a new password for the Tezi admin panel",
};

export default function ResetPassword() {
  return <ResetPasswordForm />;
}
