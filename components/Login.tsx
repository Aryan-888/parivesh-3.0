"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/firebase";
import { ensurePermanentAdminAccount, fetchUserRole } from "@/lib/auth";

interface LoginProps {
  onLogin: () => void;
}

const roleRedirects: Record<string, string> = {
  admin: "/admin",
  proponent: "/apply",
  scrutiny: "/scrutiny",
  mom: "/mom",
};

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = (searchParams.get("mode") || "").trim().toLowerCase();
    if (mode === "signup") {
      setIsRegistering(true);
    } else if (mode === "login") {
      setIsRegistering(false);
    }
  }, [searchParams]);

  const routeForRole = (role: string | null) => {
    if (!role) return "/";
    return roleRedirects[role] ?? "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let user;

      if (isRegistering) {
        user = await signUp(email, password);
      } else {
        user = await signIn(email, password);
      }

      await ensurePermanentAdminAccount(user.uid, user.email);

      onLogin();

      const role = await fetchUserRole(user.uid);
      router.push(routeForRole(role));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container flex items-center justify-center min-h-screen">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isRegistering ? "Create an account" : "Login to PARIVESH"}
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
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
            {loading
              ? isRegistering
                ? "Creating account..."
                : "Logging in..."
              : isRegistering
              ? "Create account"
              : "Login"}
          </button>
        </form>

        {isRegistering && (
          <p className="text-sm text-gray-600 mt-3 text-center">
            New registrations are created as Project Proponent accounts.
          </p>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => setIsRegistering(false)}
                type="button"
              >
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => setIsRegistering(true)}
                type="button"
              >
                Sign up
              </button>
            </>
          )}
        </div>

        <div className="mt-3 text-center text-sm">
          <span style={{ color: "var(--muted)" }}>Administrator?</span>{" "}
          <Link href="/admin-login" className="text-blue-700 hover:underline font-semibold">
            Use Admin Portal Login
          </Link>
        </div>
      </div>
    </main>
  );
}