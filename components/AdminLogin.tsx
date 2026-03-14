"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, logOut } from "@/lib/firebase";
import { ensurePermanentAdminAccount, fetchUserRole } from "@/lib/auth";

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await signIn(email.trim().toLowerCase(), password);
      await ensurePermanentAdminAccount(user.uid, user.email);

      const role = await fetchUserRole(user.uid);
      if (role !== "admin") {
        await logOut();
        setError("Admin access only. Please use the regular portal login.");
        return;
      }

      onLogin();
      router.push("/admin");
    } catch (err: any) {
      if (err?.code === "auth/invalid-credential") {
        setError("Invalid email/password. If this is admin@admin.com, use Reset Password below.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please wait a while and try again.");
      } else {
        setError(err?.message || "Failed to login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container flex items-center justify-center min-h-screen">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Admin Portal Login</h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          Restricted access for authorized administrators.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button type="submit" disabled={loading} className="button w-full">
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span style={{ color: "var(--muted)" }}>General user?</span>{" "}
          <Link href="/" className="text-blue-700 hover:underline font-semibold">
            Go to User Portal Login
          </Link>
        </div>
      </div>
    </main>
  );
}
