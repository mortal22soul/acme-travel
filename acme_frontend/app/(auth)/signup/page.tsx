import Link from "next/link";
import Signup from "@/components/auth/Signup";

export const metadata = { title: "Create account" };
export default function SignupPage() {
  return <section className="page-shell form-shell max-w-md">
    <Signup />
    <p className="text-center text-sm">Already registered? <Link href="/login" className="font-semibold text-primary underline">Sign in</Link></p>
  </section>;
}
