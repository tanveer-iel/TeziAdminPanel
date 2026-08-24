import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: " SignUp Page | TailAdmin -  Dashboard Template",
  description: "This is  SignUp Page TailAdmin Dashboard Template",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
