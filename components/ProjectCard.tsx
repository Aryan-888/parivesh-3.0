"use client";

import Link from "next/link";

export default function ProjectCard({ project, updateStatus }: any) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href={`/project/${project.id}`}>
          <h3 style={{ cursor: "pointer", margin: 0 }}>{project.projectName}</h3>
        </Link>
        <span
          className={`badge status-${project.status.toLowerCase()}`}
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {project.status}
        </span>
      </div>

      <p style={{ margin: "12px 0 4px" }}>
        <strong>Location:</strong> {project.location}
      </p>

      <p style={{ margin: "4px 0 14px", color: "var(--muted)" }}>{project.description}</p>

      {project.documentURLs?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {project.documentURLs.map((url: string, i: number) => (
            <p key={i} style={{ margin: "6px 0" }}>
              <a href={url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                View Document {i + 1}
              </a>
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button 
          className="button" 
          type="button" 
          onClick={() => updateStatus(project.id, "Approved")}
          style={{ background: 'linear-gradient(135deg, var(--accent), #238636)' }}
        >
          ✓ Approve
        </button>
        <button 
          className="button button-secondary" 
          type="button" 
          onClick={() => updateStatus(project.id, "Rejected")}
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
