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
    if (isAdminAuthPath) {
      return <AdminLogin onLogin={() => setUser(auth.currentUser)} />;
    }

    return <Login onLogin={() => setUser(auth.currentUser)} />;
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto w-full px-4 py-2 flex justify-between items-center">
          <h1 className="text-lg font-bold">PARIVESH Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}