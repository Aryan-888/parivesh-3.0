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
        <section
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background:
              "linear-gradient(125deg, rgba(11, 87, 208, 0.11), rgba(0, 127, 109, 0.1))",
          }}
        >
          <p style={{ margin: 0, fontSize: "1.1rem", color: "var(--muted)" }}>Loading PARIVESH 3.0...</p>
        </section>
      </main>
    );
  }

  const moduleLabels: Record<string, string> = {
    "/admin": "Admin Command Center",
    "/apply": "Create New Application",
    "/track": "Track Your Application",
    "/scrutiny": "Scrutiny Review Desk",
    "/mom": "MoM Finalization Desk",
  };

  const statusText =
    links.length > 0
      ? `You have ${links.length} active module${links.length > 1 ? "s" : ""} available.`
      : "No module is mapped to your account yet. Please sign in with a role-enabled account.";

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "0 6px 30px" }}>
      <section className="card" style={{ marginBottom: 0, borderRadius: 0, borderBottom: 0, padding: 0 }}>
        <div
          style={{
            background: "linear-gradient(90deg, #0b7d3f, #116d6e, #1f4f96)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 14px",
            fontSize: ".9rem",
          }}
        >
          <p style={{ margin: 0 }}>India | Government of India</p>
          <p style={{ margin: 0 }}>A- A A+ | English</p>
        </div>

        <div style={{ padding: "8px 18px", background: "#fff", display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/parivesh-logo.png"
              alt="PARIVESH Logo"
              style={{ width: "auto", maxWidth: "42vw", maxHeight: 96, height: "auto", objectFit: "contain" }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div style={{ width: 1, height: 48, background: "#d4dee8" }} />
            <div>
              <p style={{ margin: 0, color: "#0f7c2f", fontWeight: 700, fontSize: ".88rem" }}>पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय</p>
              <p style={{ margin: 0, color: "#0f7c2f", fontWeight: 700, fontSize: "1.02rem" }}>
                Ministry of Environment, Forest and Climate Change
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link className="button button-secondary" href="/login">Login</Link>
            <Link className="button" href="/signup">Registration</Link>
          </div>
        </div>

        <div style={{ background: "#fff", borderTop: "1px solid #dbe4ec", borderBottom: "1px solid #dbe4ec", padding: "8px 12px", display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          {["Home", "About", "Clearance", "Downloads", "Guide", "Contact", "Dashboard", "Complaint", "Vacancies"].map((item) => (
            <span key={item} style={{ fontWeight: 700, fontSize: ".94rem", color: item === "Home" ? "#0b7d3f" : "#1f2d3d" }}>
              {item}
            </span>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link className="button button-secondary" href="/apply">Apply</Link>
            <Link className="button button-secondary" href="/track">Track</Link>
          </div>
        </div>

        <div style={{ background: "#ffffff", borderTop: "1px solid #e5edf4", padding: "6px 12px", fontWeight: 700 }}>
          New User Notice: complete registration first, then submit proposal with mandatory environmental documents.
        </div>
      </section>

      <section className="card" style={{ marginTop: 0, borderRadius: 0, padding: 0, overflow: "hidden" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 0 }}>
          <div style={{ minHeight: 330, background: "linear-gradient(115deg, #27a2c7 2%, #73cf4e 98%)", position: "relative", padding: "30px 26px" }}>
            <div style={{ marginLeft: 0 }}>
              <p style={{ margin: 0, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 800, color: "#145289", letterSpacing: ".02em" }}>
                PARIVESH <span style={{ color: "#f2cb3c" }}>3.0</span>
              </p>
              <p style={{ marginTop: 10, color: "#1c2d41", maxWidth: 420, fontWeight: 700 }}>
                PRO-ACTIVE AND RESPONSIVE FACILITATION BY INTERACTIVE VIRTUOUS ENVIRONMENTAL SINGLE WINDOW HUB
              </p>
              <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="button" href="/track">Track Proposal</Link>
                <Link className="button button-secondary" href="/apply">Apply Now</Link>
              </div>
            </div>
          </div>

          <div style={{ minHeight: 330, background: "linear-gradient(120deg, #3a9ebe, #6ecb69)", display: "grid", placeItems: "center", padding: 18 }}>
            <div
              style={{
                width: "85%",
                maxWidth: 450,
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: "#ffffff",
                border: "16px solid rgba(255, 255, 255, 0.94)",
                boxShadow: "0 8px 22px rgba(25, 65, 97, 0.2)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <img
                src="/parivesh-logo.png"
                alt="PARIVESH Logo"
                style={{ width: "74%", height: "74%", objectFit: "contain" }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 18, padding: 20, background: "linear-gradient(180deg, rgba(46,125,50,.15), rgba(46,125,50,.03))" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Link href="/track" className="card" style={{ textDecoration: "none", padding: "16px 18px", borderRadius: 999, boxShadow: "var(--shadow-sm)", fontWeight: 700 }}>
              Track Your Proposal
            </Link>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <Link href="/demo-checklist" className="card" style={{ textDecoration: "none", padding: "16px 18px", borderRadius: 999, boxShadow: "var(--shadow-sm)", fontWeight: 700 }}>
                User Journey
              </Link>
              <Link href="/apply" className="card" style={{ textDecoration: "none", padding: "16px 18px", borderRadius: 999, boxShadow: "var(--shadow-sm)", fontWeight: 700 }}>
                Know Your Approval
              </Link>
            </div>
          </div>

          <div className="card" style={{ boxShadow: "var(--shadow-sm)", borderRadius: 10, background: "#eff8ef" }}>
            <h2 style={{ marginTop: 0, color: "#1a3f5f" }}>What&apos;s New</h2>
            <div style={{ height: 2, background: "#2e7d32", marginBottom: 12 }} />
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ margin: 0 }}><span className="badge">06/03/2026</span> Sustainable sand mining management guidelines update.</p>
              <p style={{ margin: 0 }}><span className="badge">05/03/2026</span> Draft notification for creation of standing authority.</p>
              <p style={{ margin: 0 }}><span className="badge">28/02/2026</span> Online scrutiny checklist process enhancement deployed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Available Modules For Your Account</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>{statusText}</p>
        {links.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No module is available for your current role.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {links.map((href) => (
              <Link key={href} href={href} className="card" style={{ textDecoration: "none", boxShadow: "var(--shadow-sm)", borderRadius: 10 }}>
                <strong>{moduleLabels[href] || href}</strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
