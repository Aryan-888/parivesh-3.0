"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import ProtectedRoute from "../../components/ProtectedRoute";
import { isPermanentAdminEmail } from "@/lib/rbac";

interface User {
  uid: string;
  email: string;
  role: string;
}

interface Application {
  id: string;
  projectName: string;
  location: string;
  status: string;
  category?: string;
  sector?: string;
  payment?: {
    status?: string;
  };
}

interface GistTemplate {
  id: string;
  category: "A" | "B1" | "B2";
  template: string;
}

interface SectorParameter {
  id: string;
  sectorName: string;
  defaultNotes: string;
}

const defaultTemplate = [
  "Meeting Gist",
  "",
  "Project: {{projectName}}",
  "Location: {{location}}",
  "Category: {{category}}",
  "Sector: {{sector}}",
  "",
  "Project Overview:",
  "{{description}}",
  "",
  "Sector-Specific Considerations:",
  "{{sectorNotes}}",
].join("\n");

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [templates, setTemplates] = useState<GistTemplate[]>([]);
  const [sectors, setSectors] = useState<SectorParameter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<"A" | "B1" | "B2">("A");
  const [templateText, setTemplateText] = useState(defaultTemplate);
  const [sectorName, setSectorName] = useState("");
  const [sectorNotes, setSectorNotes] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchApplications(),
      fetchTemplates(),
      fetchSectors(),
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData: User[] = querySnapshot.docs.map((item) => ({
        uid: item.id,
        ...(item.data() as Omit<User, "uid">),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchApplications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "applications"));
      const appsData: Application[] = querySnapshot.docs.map((item) => ({
        id: item.id,
        projectName: item.data().projectName,
        location: item.data().location,
        status: item.data().status,
        category: item.data().category,
        sector: item.data().sector,
        payment: item.data().payment,
      }));
      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const snapshot = await getDocs(collection(db, "gistTemplates"));
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<GistTemplate, "id">),
      }));
      setTemplates(rows);

      const current = rows.find((row) => row.category === selectedCategory);
      if (current) {
        setTemplateText(current.template);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchSectors = async () => {
    try {
      const snapshot = await getDocs(collection(db, "sectorParameters"));
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<SectorParameter, "id">),
      }));
      setSectors(rows);
    } catch (error) {
      console.error("Error fetching sectors:", error);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    const targetUser = users.find((user) => user.uid === uid);

    if (isPermanentAdminEmail(targetUser?.email) && newRole !== "admin") {
      alert("This account is a permanent admin and cannot be downgraded.");
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { role: newRole });
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        )
      );
      alert("Role updated successfully.");
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role.");
    }
  };

  const handleSelectCategory = (category: "A" | "B1" | "B2") => {
    setSelectedCategory(category);
    const existing = templates.find((row) => row.category === category);
    setTemplateText(existing?.template || defaultTemplate.replace("{{category}}", category));
  };

  const saveTemplate = async () => {
    if (!templateText.trim()) {
      alert("Template cannot be empty.");
      return;
    }

    try {
      await setDoc(doc(db, "gistTemplates", selectedCategory), {
        category: selectedCategory,
        template: templateText,
        updatedAt: serverTimestamp(),
      });
      await fetchTemplates();
      alert("Template saved successfully.");
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template.");
    }
  };

  const saveSectorParameter = async () => {
    if (!sectorName.trim() || !sectorNotes.trim()) {
      alert("Sector name and default notes are required.");
      return;
    }

    const docId = sectorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      await setDoc(doc(db, "sectorParameters", docId), {
        sectorName: sectorName.trim(),
        defaultNotes: sectorNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      setSectorName("");
      setSectorNotes("");
      await fetchSectors();
      alert("Sector parameter saved.");
    } catch (error) {
      console.error("Error saving sector parameter:", error);
      alert("Failed to save sector parameter.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRole="admin">
        <main className="container">
          <p>Loading...</p>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRole="admin">
      <main className="container">
        <header className="header">
          <div>
            <h1 className="title">Admin Dashboard</h1>
            <p className="subtitle">Manage users, templates, sectors, and application oversight.</p>
            <p className="text-sm" style={{ marginTop: 8, color: "var(--muted)" }}>
              Role Scope: Role assignment, template provisioning, and sector parameter governance.
            </p>
          </div>
        </header>

        <div className="space-y-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Gist Templates (A/B1/B2)</h2>
            <div className="field">
              <label>Category</label>
              <select
                className="select"
                value={selectedCategory}
                onChange={(e) => handleSelectCategory(e.target.value as "A" | "B1" | "B2")}
              >
                <option value="A">A</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>
            <div className="field">
              <label>Template Content</label>
              <textarea
                className="textarea"
                rows={10}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
              />
            </div>
            <p style={{ color: "var(--muted)" }}>
              Allowed placeholders: {"{{projectName}}"}, {"{{location}}"}, {"{{category}}"}, {"{{sector}}"}, {"{{description}}"}, {"{{sectorNotes}}"}
            </p>
            <button className="button" type="button" onClick={saveTemplate}>
              Save Template
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Sector Parameters</h2>
            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Sector Name</label>
                <input
                  className="input"
                  type="text"
                  value={sectorName}
                  onChange={(e) => setSectorName(e.target.value)}
                  placeholder="e.g. Mining"
                />
              </div>
              <div className="field">
                <label>Default Notes</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={sectorNotes}
                  onChange={(e) => setSectorNotes(e.target.value)}
                  placeholder="Baseline environmental points for this sector"
                />
              </div>
            </div>
            <button className="button" type="button" onClick={saveSectorParameter}>
              Save Sector Parameter
            </button>

            <div style={{ marginTop: 16 }}>
              {sectors.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No sectors configured yet.</p>
              ) : (
                sectors.map((row) => (
                  <div key={row.id} className="card" style={{ marginTop: 10 }}>
                    <h3 style={{ marginTop: 0 }}>{row.sectorName}</h3>
                    <p style={{ marginBottom: 0 }}>{row.defaultNotes}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{user.uid}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">{user.role}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          disabled={isPermanentAdminEmail(user.email)}
                        >
                          <option value="admin">Admin</option>
                          <option value="proponent">Proponent</option>
                          <option value="scrutiny">Scrutiny</option>
                          <option value="mom">MoM</option>
                        </select>
                        {isPermanentAdminEmail(user.email) && (
                          <span className="ml-2 text-xs text-blue-700 font-semibold">Permanent Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Applications Overview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{app.projectName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{app.location}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{app.category || "-"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{app.sector || "-"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">{app.payment?.status || "pending"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
