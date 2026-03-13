"use client";

import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";
import ProjectList from "../components/ProjectList";
import ProjectForm from "../components/ProjectForm";

export default function Home() {

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleSubmit = async () => {
    // Validation: Ensure all required fields are filled
    if (!projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }
    if (!location.trim()) {
      alert("Please enter a location.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }
    if (files.length === 0) {
      alert("Please upload at least one document.");
      return;
    }

    try {
      const { db, storage } = await import("../lib/firebase");
      const { collection, addDoc } = await import("firebase/firestore");
      const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");

      let fileURLs: string[] = [];

      for (const file of files) {
        const maxSize = 50 * 1024 * 1024;

        if (file.size > maxSize) {
          alert(`${file.name} exceeds 50MB`);
          return;
        }

        if (file.type !== "application/pdf") {
          alert(`${file.name} must be a PDF`);
          return;
        }

        const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

              setUploadProgress(Math.round(progress));
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              fileURLs.push(url);
              resolve(url);
            }
          );
        });
      }

      await addDoc(collection(db, "projects"), {
        projectName,
        location,
        description,
        documentURLs: fileURLs,
        status: "Pending",
        createdAt: new Date()
      });

      alert("Project submitted!");

      setProjectName("");
      setLocation("");
      setDescription("");
      setFiles([]);
      setUploadProgress(0);

      loadProjects();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error?.message ?? error}`);
      setUploadProgress(0);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    const { db } = await import("../lib/firebase");
    const { collection, getDocs } = await import("firebase/firestore");

    const snapshot = await getDocs(collection(db, "projects"));

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    setProjects(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {

    const { db } = await import("../lib/firebase");
    const { doc, updateDoc } = await import("firebase/firestore");

    const projectRef = doc(db, "projects", id);

    await updateDoc(projectRef, { status: newStatus });

    loadProjects();
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects
    .filter(p => filter === "All" ? true : p.status === filter)
    .filter(p =>
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1 className="title">PARIVESH Portal</h1>
          <p className="subtitle">
            Manage projects, track document uploads, and approve submissions in one
            clean dashboard.
          </p>
        </div>
      </header>

      <div className="grid grid-2">
        <Dashboard projects={projects} />
        <div>
          <ProjectList projects={filteredProjects} updateStatus={updateStatus} loading={loading} />
          <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }} className="search-filter">
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                className="input"
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <select
              className="select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <ProjectForm
          projectName={projectName}
          setProjectName={setProjectName}
          location={location}
          setLocation={setLocation}
          description={description}
          setDescription={setDescription}
          files={files}
          setFiles={setFiles}
          removeFile={removeFile}
          handleSubmit={handleSubmit}
          uploadProgress={uploadProgress}
        />
      </div>
    </main>
  );
}