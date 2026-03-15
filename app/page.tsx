"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { fetchUserRole } from "@/lib/auth";
import { getCategoryEnvironmentalRiskScore } from "@/lib/aiDecisionSupport";

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
    <main className="container">
      <nav
        className="card"
        style={{
          marginBottom: 16,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "linear-gradient(120deg, rgba(15, 31, 61, 0.95), rgba(11, 87, 208, 0.92))",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#6fe3d2",
              boxShadow: "0 0 0 5px rgba(111, 227, 210, 0.2)",
            }}
          />
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: "0.02em" }}>PARIVESH 3.0</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="button button-secondary" style={{ background: "#ffffff", color: "#0f1f3d" }} href="/apply">
            Apply
          </Link>
          <Link className="button button-secondary" style={{ background: "#ffffff", color: "#0f1f3d" }} href="/track">
            Track
          </Link>
          <Link className="button button-secondary" style={{ background: "#ffffff", color: "#0f1f3d" }} href="/admin">
            Admin
          </Link>
        </div>
      </nav>

      <section
        className="card"
        style={{
          overflow: "hidden",
          position: "relative",
          background:
            "linear-gradient(125deg, rgba(11, 87, 208, 0.14), rgba(0, 127, 109, 0.15) 52%, rgba(255, 255, 255, 0.96))",
          borderRadius: 20,
          padding: "34px 26px",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -80,
            top: -90,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(47, 124, 246, 0.32), rgba(47, 124, 246, 0.06))",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -55,
            bottom: -70,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 127, 109, 0.32), rgba(0, 127, 109, 0.06))",
          }}
        />

        <div style={{ position: "relative" }}>
          <span className="badge" style={{ marginBottom: 12 }}>
            Environmental Clearance Workflow Platform
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              lineHeight: 1.03,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
            }}
          >
            PARIVESH 3.0
          </h1>
          <p
            style={{
              marginTop: 12,
              marginBottom: 20,
              maxWidth: 760,
              color: "var(--muted)",
              fontSize: "1.02rem",
              lineHeight: 1.6,
            }}
          >
            A single-window digital corridor for project proponents, scrutiny officers, and MoM teams.
            Submit, validate, and finalize applications with traceable progress at every stage.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <Link className="button" href="/apply">
              Start New Application
            </Link>
            <Link className="button button-secondary" href="/track">
              Track Application
            </Link>
            <Link className="button button-secondary" href="/demo-checklist">
              Open Demo Checklist
            </Link>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(15, 31, 61, 0.16)",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          {statusText}
        </div>
      </section>

      <section className="grid" style={{ marginTop: 24, gap: 16 }}>
        <div className="grid grid-2" style={{ gap: 16 }}>
          <article className="card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>Role-Aware Access</h2>
            <p style={{ marginTop: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Modules appear based on your mapped role so every team sees only what they need.
            </p>
            <div className="badge">Secure RBAC + Firestore Rules</div>
          </article>

          <article className="card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>End-to-End Visibility</h2>
            <p style={{ marginTop: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              Keep application state transparent from submission to scrutiny, referral, MoM, and finalization.
            </p>
            <div className="badge">Live Status Timeline</div>
          </article>
        </div>

        <article className="card" style={{ paddingTop: 20 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Your Available Modules</h2>
          {links.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No module is available for your current role.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              {links.map((href, index) => (
                <Link
                  key={href}
                  href={href}
                  className="card"
                  style={{
                    textDecoration: "none",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-sm)",
                    padding: 16,
                    animation: `fadeInUp ${0.25 + index * 0.08}s ease both`,
                    display: "block",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700, color: "var(--foreground)" }}>
                    {moduleLabels[href] || href}
                  </p>
                  <p style={{ margin: "7px 0 0", color: "var(--muted)", fontSize: ".93rem" }}>Open module</p>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card" style={{ paddingTop: 20 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Environmental Risk Score Reference</h2>
          <p style={{ marginTop: 0, color: "var(--muted)", marginBottom: 14 }}>
            Category-based base risk scores used by the portal.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { category: "A", color: "#0b57d0" },
              { category: "B1", color: "#1f7f4a" },
              { category: "B2", color: "#b76b00" },
            ].map((entry) => (
              <div
                key={entry.category}
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  boxShadow: "var(--shadow-sm)",
                  borderColor: "rgba(15, 31, 61, 0.1)",
                }}
              >
                <p style={{ margin: 0, fontSize: ".83rem", color: "var(--muted)", letterSpacing: ".04em" }}>CATEGORY</p>
                <p style={{ margin: "6px 0 4px", fontWeight: 700, fontSize: "1.1rem" }}>{entry.category}</p>
                <p style={{ margin: 0, color: entry.color, fontWeight: 700, fontSize: "1.55rem" }}>
                  {getCategoryEnvironmentalRiskScore(entry.category)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
