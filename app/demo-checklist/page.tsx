import Link from "next/link";

export default function DemoChecklistPage() {
  return (
    <main className="container">
      <header className="header">
        <div>
          <h1 className="title">Demo Checklist</h1>
          <p className="subtitle">Presentation script for PARIVESH 3.0 end-to-end role workflow demo.</p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Pre-Demo Setup</h2>
        <ol>
          <li>Ensure Firestore rules are deployed.</li>
          <li>Ensure at least one admin account exists.</li>
          <li>Keep sample PDF files ready for mandatory document upload.</li>
          <li>Open two browser sessions: one proponent and one internal user session.</li>
        </ol>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Demo Flow Script</h2>
        <ol>
          <li>Admin Portal Login: Open /admin-login and sign in as admin.</li>
          <li>Admin Configuration: Update A/B1/B2 template and sector parameters.</li>
          <li>Proponent Draft: Register proponent, fill partial form, save draft, reopen draft.</li>
          <li>Final Submission: Complete form, upload 3 PDFs, verify payment, submit.</li>
          <li>Scrutiny + EDS: Verify checklist, issue EDS with remarks.</li>
          <li>Proponent Response: Open EDS case, respond with notes, resubmit.</li>
          <li>Scrutiny Referral: Review response, complete checklist, refer to meeting.</li>
          <li>MoM Stage: Generate gist from template, edit, save, export PDF/DOCX, finalize.</li>
          <li>Tracking: Check timeline in /track and verify data isolation.</li>
        </ol>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Security Proof Points</h2>
        <ol>
          <li>Permanent admin enforcement for designated email.</li>
          <li>Public signup restricted to proponent role.</li>
          <li>Owner-based data isolation.</li>
          <li>Scrutiny checklist immutability from MoM role.</li>
          <li>Status transitions validated by backend rules.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button" href="/">
            Back to Portal
          </Link>
          <Link className="button button-secondary" href="/admin-login">
            Admin Login
          </Link>
        </div>
      </section>
    </main>
  );
}
