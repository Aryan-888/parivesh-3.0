"use client";

export default function Dashboard({ projects }: any) {
  const total = projects.length;
  const pending = projects.filter((p: any) => p.status === "Pending").length;
  const approved = projects.filter((p: any) => p.status === "Approved").length;
  const rejected = projects.filter((p: any) => p.status === "Rejected").length;

  const statCard = (label: string, value: number, statusClass: string) => (
    <div className="stat-card">
      <p className="badge">{label}</p>
      <p className={statusClass} style={{ fontSize: 36, margin: 8 }}>
        {value}
      </p>
    </div>
  );

  return (
    <section className="card">
      <h2>Dashboard</h2>

      <div className="grid grid-2">
        {statCard("Total", total, "")}
        {statCard("Pending", pending, "status-pending")}
        {statCard("Approved", approved, "status-approved")}
        {statCard("Rejected", rejected, "status-rejected")}
      </div>
    </section>
  );
}
