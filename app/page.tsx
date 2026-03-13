"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { fetchUserRole } from "@/lib/auth";

const roleRoutes: Record<string, string[]> = {
  admin: ["/admin"],
  proponent: ["/apply", "/track"],
  scrutiny: ["/scrutiny"],
  mom: ["/mom"],
};

export default function Home() {
  const [links, setLinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoleLinks = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLinks([]);
        setLoading(false);
        return;
      }

      const role = await fetchUserRole(user.uid);
      setLinks(role ? roleRoutes[role] || [] : []);
      setLoading(false);
    };

    loadRoleLinks();
  }, []);

  if (loading) {
    return (
      <main className="container">
        <p>Loading portal...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1 className="title">PARIVESH 3.0 Portal</h1>
          <p className="subtitle">Use your role-specific workflow modules from here.</p>
        </div>
      </header>

      <section className="card">
        <h2>Available Modules</h2>
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          <Link className="button button-secondary" href="/demo-checklist">
            Open Demo Checklist
          </Link>
        </div>
        {links.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No module is available for your current role.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            {links.map((href) => (
              <Link key={href} className="button" href={href}>
                {href === "/admin"
                  ? "Admin Dashboard"
                  : href === "/apply"
                  ? "Apply"
                  : href === "/track"
                  ? "Track Application"
                  : href === "/scrutiny"
                  ? "Scrutiny Dashboard"
                  : href === "/mom"
                  ? "MoM Dashboard"
                  : href}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
