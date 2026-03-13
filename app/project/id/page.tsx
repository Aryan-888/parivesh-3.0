"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProjectDetail() {

  const { id } = useParams();

  const [project, setProject] = useState<any>(null);

  useEffect(() => {

    const loadProject = async () => {

      const { db } = await import("../../../lib/firebase");
      const { doc, getDoc } = await import("firebase/firestore");

      const projectRef = doc(db, "projects", id as string);

      const snapshot = await getDoc(projectRef);

      setProject(snapshot.data());

    };

    loadProject();

  }, []);

  if (!project) return <p>Loading...</p>;

  return (

    <div style={{ padding: 40 }}>

      <h1>{project.projectName}</h1>

      <p><b>Location:</b> {project.location}</p>

      <p><b>Description:</b></p>

      <p>{project.description}</p>

      <h3>Documents</h3>

      {project.documentURLs?.map((url: string, i: number) => (
        <p key={i}>
          <a href={url} target="_blank">
            View Document {i + 1}
          </a>
        </p>
      ))}

      <p>
        <b>Status:</b> {project.status}
      </p>

    </div>

  );

}