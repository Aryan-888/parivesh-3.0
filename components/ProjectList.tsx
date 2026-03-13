"use client";

import ProjectCard from "../components/ProjectCard";

export default function ProjectList({ projects, updateStatus, loading }: any) {
  return (
    <section className="card">
      <h2>Submitted Projects</h2>

      {loading ? (
        <p style={{ color: "var(--muted)", marginTop: 12 }}>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p style={{ color: "var(--muted)", marginTop: 12 }}>
          No projects submitted yet. Once you add one, it will appear here.
        </p>
      ) : (
        projects.map((p: any) => (
          <ProjectCard key={p.id} project={p} updateStatus={updateStatus} />
        ))
      )}
    </section>
  );
}
