"use client";

import { useState, useEffect } from "react";
import { auth, logOut } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./Login";
import AdminLogin from "./AdminLogin";
import { usePathname } from "next/navigation";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const isAdminAuthPath = pathname === "/admin" || pathname === "/admin-login";
  const isPublicHomePath = pathname === "/";
  const hideGlobalNav = pathname === "/";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <main className="container flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    if (isPublicHomePath) {
      return <>{children}</>;
    }

    if (isAdminAuthPath) {
      return <AdminLogin onLogin={() => setUser(auth.currentUser)} />;
    }

    return <Login onLogin={() => setUser(auth.currentUser)} />;
  }

  return (
    <>
      {!hideGlobalNav && (
        <nav className="bg-white border-b" style={{ boxShadow: "0 2px 8px rgba(20, 54, 88, 0.08)" }}>
          <div style={{ height: 4, background: "linear-gradient(90deg, #f57c00, #2e7d32)" }} />
          <div className="max-w-6xl mx-auto w-full px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/parivesh-logo.png"
                alt="PARIVESH Logo"
                style={{ width: 150, maxWidth: "36vw", height: "auto", objectFit: "contain" }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p className="text-xs" style={{ margin: 0, color: "#5b6d80", letterSpacing: ".04em" }}>
                  MINISTRY PORTAL
                </p>
                <h1 className="text-sm font-bold" style={{ margin: 0, color: "#1f5f93", whiteSpace: "nowrap" }}>
                  PARIVESH 3.0
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-white rounded text-xs"
                style={{ background: "linear-gradient(135deg, #b23c17, #d24f2a)" }}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      {children}
    </>
  );
}