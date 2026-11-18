import Link from "next/link";
import Login from "@/components/auth/Login";

export const metadata = { title: "Sign in" };
export default function LoginPage() {
  return <section className="page-shell form-shell max-w-md">
    <Login />
    <p className="text-center text-sm">New to ACME? <Link href="/signup" className="font-semibold text-primary underline">Create an account</Link></p>
  </section>;
}
