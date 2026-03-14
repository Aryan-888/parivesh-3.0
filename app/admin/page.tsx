"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "../../components/ProtectedRoute";
import { isPermanentAdminEmail } from "@/lib/rbac";
import { getAllStatesWithDistricts } from "india-state-district";

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
  description?: string;
  category?: string;
  sector?: string;
  payment?: {
    status?: string;
  };
  documents?: Array<{
    key?: string;
    name?: string;
    url?: string;
    contentType?: string;
  }>;
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

interface LocationHierarchyItem {
  id: string;
  stateName: string;
  districts: string[];
}

interface CategoryDocumentRequirement {
  key: string;
  label: string;
}

interface CategoryDocumentConfig {
  id: string;
  category: "A" | "B1" | "B2";
  requiredDocuments: CategoryDocumentRequirement[];
}

interface EDSPoint {
  code: string;
  label: string;
}

interface AffidavitPoint {
  code: string;
  label: string;
}

interface AffidavitTemplate {
  id: string;
  category: "A" | "B1" | "B2";
  points: AffidavitPoint[];
}

const DEFAULT_REQUIRED_DOCUMENTS: CategoryDocumentRequirement[] = [
  { key: "eiaReport", label: "EIA Report (PDF)" },
  { key: "empPlan", label: "Environment Management Plan - EMP (PDF)" },
  { key: "complianceReport", label: "Compliance Undertaking (PDF)" },
];

const DEFAULT_EDS_POINTS: EDSPoint[] = [
  { code: "FEE_DETAILS", label: "Submit processing fee details." },
  { code: "PFR", label: "Submit pre-feasibility report (PFR)." },
  { code: "EMP", label: "Submit EMP document." },
  { code: "FORM_1_CAF", label: "Submit Form-1 / 1-M / CAF." },
  { code: "LAND_DOCS", label: "Submit land documents." },
  { code: "LAND_OWNER_CONSENT", label: "Submit land-owner consent (if applicable)." },
  { code: "LOI", label: "Submit LOI / LOI extension copy." },
  { code: "MINING_PLAN", label: "Submit mining plan approval and approved plan." },
  { code: "CERT_200_500", label: "Submit 200m and 500m certificates." },
  { code: "GRAM_PANCHAYAT_NOC", label: "Submit Gram Panchayat NOC." },
  { code: "FOREST_WILDLIFE", label: "Submit forest / wildlife / NBWL clearances (if applicable)." },
  { code: "WATER_NOC", label: "Submit water NOC (CGWA / authority)." },
  { code: "CTE_CTO", label: "Submit CTE / CTO compliance report." },
  { code: "KML", label: "Submit KML with clear boundary." },
  { code: "DRONE_VIDEO", label: "Submit drone video of applied area." },
  { code: "GEOTAG_PHOTOS", label: "Submit geo-tagged project photos." },
  { code: "AFFIDAVITS", label: "Submit all notarized affidavits." },
  { code: "CER", label: "Submit CER details with local consent." },
  { code: "GIST", label: "Submit GIST details." },
];

const DEFAULT_AFFIDAVIT_POINTS: AffidavitPoint[] = [
  { code: "NO_OUTSIDE_MINING", label: "Affidavit: No activity outside approved lease/project boundary." },
  { code: "WATER_NO_DISCHARGE", label: "Affidavit: No untreated/polluted discharge into natural water bodies." },
  { code: "PLANTATION_COMMITMENT", label: "Affidavit: Plantation commitment with survival compliance." },
  { code: "DUST_TRANSPORT_CONTROL", label: "Affidavit: Dust suppression and covered transport compliance." },
  { code: "LITIGATION_DECLARATION", label: "Affidavit: Declaration on pending litigation and legal compliance." },
  { code: "SIX_MONTH_REPORTING", label: "Affidavit: Six-monthly compliance reporting commitment." },
];

const normalizeDistricts = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item, index, arr) => item && arr.indexOf(item) === index)
      .sort((a, b) => a.localeCompare(b));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item, index, arr) => item && arr.indexOf(item) === index)
      .sort((a, b) => a.localeCompare(b));
  }

  return [];
};

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
  const [locations, setLocations] = useState<LocationHierarchyItem[]>([]);
  const [docConfigs, setDocConfigs] = useState<CategoryDocumentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<"A" | "B1" | "B2">("A");
  const [templateText, setTemplateText] = useState(defaultTemplate);
  const [sectorName, setSectorName] = useState("");
  const [sectorNotes, setSectorNotes] = useState("");
  const [locationStateName, setLocationStateName] = useState("");
  const [locationDistricts, setLocationDistricts] = useState("");
  const [seedingLocations, setSeedingLocations] = useState(false);
  const [docConfigCategory, setDocConfigCategory] = useState<"A" | "B1" | "B2">("A");
  const [docKeyInput, setDocKeyInput] = useState("");
  const [docLabelInput, setDocLabelInput] = useState("");
  const [editingRequirements, setEditingRequirements] = useState<CategoryDocumentRequirement[]>(DEFAULT_REQUIRED_DOCUMENTS);
  const [edsPoints, setEdsPoints] = useState<EDSPoint[]>(DEFAULT_EDS_POINTS);
  const [edsCodeInput, setEdsCodeInput] = useState("");
  const [edsLabelInput, setEdsLabelInput] = useState("");
  const [affidavitTemplates, setAffidavitTemplates] = useState<AffidavitTemplate[]>([]);
  const [affidavitCategory, setAffidavitCategory] = useState<"A" | "B1" | "B2">("A");
  const [affidavitCodeInput, setAffidavitCodeInput] = useState("");
  const [affidavitLabelInput, setAffidavitLabelInput] = useState("");
  const [editingAffidavitPoints, setEditingAffidavitPoints] = useState<AffidavitPoint[]>(DEFAULT_AFFIDAVIT_POINTS);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsers([]);
        setApplications([]);
        setTemplates([]);
        setSectors([]);
        setLocations([]);
        setLoading(false);
        return;
      }

      await loadAll();
    });

    return () => unsubscribe();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchApplications(),
      fetchTemplates(),
      fetchSectors(),
      fetchLocationHierarchy(),
      fetchCategoryDocumentConfigs(),
      fetchEdsPointBank(),
      fetchAffidavitTemplates(),
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
        description: item.data().description,
        category: item.data().category,
        sector: item.data().sector,
        payment: item.data().payment,
        documents: item.data().documents,
      }));
      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const selectedApplication =
    applications.find((app) => app.id === selectedApplicationId) || null;

  const handleFinalApproval = async (app: Application) => {
    if (app.status === "finalized") {
      alert("This project is already finalized.");
      return;
    }

    if (!(app.status === "mom_generated" || app.status === "referred")) {
      alert("Final approval is available after referral/MoM stage only.");
      return;
    }

    try {
      await updateDoc(doc(db, "applications", app.id), {
        status: "finalized",
        updatedAt: new Date().toISOString(),
        adminApproval: {
          approvedByRole: "admin",
          approvedAt: serverTimestamp(),
        },
      });

      alert("Project finalized successfully.");
      await fetchApplications();
    } catch (error) {
      console.error("Error finalizing project:", error);
      alert("Failed to finalize project.");
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

  const fetchLocationHierarchy = async () => {
    try {
      const snapshot = await getDocs(collection(db, "locationHierarchy"));
      const rows: LocationHierarchyItem[] = snapshot.docs
        .map((item) => {
          const data = item.data() as {
            stateName?: string;
            state?: string;
            name?: string;
            districts?: string[] | string;
            districtList?: string[] | string;
            district?: string[] | string;
          };

          return {
            id: item.id,
            stateName: (data.stateName || data.state || data.name || item.id || "").trim(),
            districts: normalizeDistricts(data.districts || data.districtList || data.district),
          };
        })
        .filter((item) => item.stateName && item.districts.length > 0)
        .sort((a, b) => a.stateName.localeCompare(b.stateName));
      setLocations(rows);
    } catch (error) {
      console.error("Error fetching location hierarchy:", error);
    }
  };

  const normalizeRequiredDocuments = (value: unknown): CategoryDocumentRequirement[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const seen = new Set<string>();
    const rows: CategoryDocumentRequirement[] = [];

    value.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const raw = item as { key?: unknown; label?: unknown };
      const key = String(raw.key || "").trim();
      const label = String(raw.label || "").trim();

      if (!key || !label || seen.has(key)) {
        return;
      }

      seen.add(key);
      rows.push({ key, label });
    });

    return rows;
  };

  const fetchCategoryDocumentConfigs = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categoryDocumentRequirements"));
      const rows: CategoryDocumentConfig[] = snapshot.docs
        .map((item) => {
          const data = item.data() as {
            category?: string;
            requiredDocuments?: unknown;
          };

          const category = String(data.category || item.id || "").trim().toUpperCase();
          if (category !== "A" && category !== "B1" && category !== "B2") {
            return null;
          }

          const requiredDocuments = normalizeRequiredDocuments(data.requiredDocuments);
          return {
            id: item.id,
            category,
            requiredDocuments: requiredDocuments.length > 0 ? requiredDocuments : DEFAULT_REQUIRED_DOCUMENTS,
          } as CategoryDocumentConfig;
        })
        .filter((item): item is CategoryDocumentConfig => item !== null)
        .sort((a, b) => a.category.localeCompare(b.category));

      setDocConfigs(rows);
    } catch (error) {
      console.error("Error fetching category document configs:", error);
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

  const handleDocConfigCategoryChange = (category: "A" | "B1" | "B2") => {
    setDocConfigCategory(category);
    const existing = docConfigs.find((item) => item.category === category);
    setEditingRequirements(existing?.requiredDocuments || DEFAULT_REQUIRED_DOCUMENTS);
  };

  const addRequiredDocument = () => {
    const key = docKeyInput.trim();
    const label = docLabelInput.trim();

    if (!key || !label) {
      alert("Document key and label are required.");
      return;
    }

    if (editingRequirements.some((item) => item.key === key)) {
      alert("Document key already exists for this category.");
      return;
    }

    setEditingRequirements((prev) => [...prev, { key, label }]);
    setDocKeyInput("");
    setDocLabelInput("");
  };

  const removeRequiredDocument = (key: string) => {
    setEditingRequirements((prev) => prev.filter((item) => item.key !== key));
  };

  const saveCategoryDocumentConfig = async () => {
    if (editingRequirements.length === 0) {
      alert("At least one required document must be configured.");
      return;
    }

    try {
      await setDoc(doc(db, "categoryDocumentRequirements", docConfigCategory), {
        category: docConfigCategory,
        requiredDocuments: editingRequirements,
        updatedAt: serverTimestamp(),
      });

      await fetchCategoryDocumentConfigs();
      alert("Category document requirements saved.");
    } catch (error) {
      console.error("Error saving category document config:", error);
      alert("Failed to save category document requirements.");
    }
  };

  const normalizeEdsPoints = (value: unknown): EDSPoint[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const seen = new Set<string>();
    const rows: EDSPoint[] = [];

    value.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const raw = item as { code?: unknown; label?: unknown };
      const code = String(raw.code || "").trim();
      const label = String(raw.label || "").trim();

      if (!code || !label || seen.has(code)) {
        return;
      }

      seen.add(code);
      rows.push({ code, label });
    });

    return rows;
  };

  const fetchEdsPointBank = async () => {
    try {
      const snapshot = await getDocs(collection(db, "edsPointBank"));
      const first = snapshot.docs[0];
      if (!first) {
        setEdsPoints(DEFAULT_EDS_POINTS);
        return;
      }

      const data = first.data() as { points?: unknown };
      const points = normalizeEdsPoints(data.points);
      setEdsPoints(points.length > 0 ? points : DEFAULT_EDS_POINTS);
    } catch (error) {
      console.error("Error fetching EDS point bank:", error);
      setEdsPoints(DEFAULT_EDS_POINTS);
    }
  };

  const addEdsPoint = () => {
    const code = edsCodeInput.trim().toUpperCase();
    const label = edsLabelInput.trim();

    if (!code || !label) {
      alert("EDS code and label are required.");
      return;
    }

    if (edsPoints.some((item) => item.code === code)) {
      alert("EDS code already exists.");
      return;
    }

    setEdsPoints((prev) => [...prev, { code, label }]);
    setEdsCodeInput("");
    setEdsLabelInput("");
  };

  const removeEdsPoint = (code: string) => {
    setEdsPoints((prev) => prev.filter((item) => item.code !== code));
  };

  const saveEdsPointBank = async () => {
    if (edsPoints.length === 0) {
      alert("At least one EDS point is required.");
      return;
    }

    try {
      await setDoc(doc(db, "edsPointBank", "default"), {
        points: edsPoints,
        updatedAt: serverTimestamp(),
      });

      alert("EDS point bank saved.");
    } catch (error) {
      console.error("Error saving EDS point bank:", error);
      alert("Failed to save EDS point bank.");
    }
  };

  const resetEdsPointsToDefault = () => {
    setEdsPoints(DEFAULT_EDS_POINTS);
  };

  const normalizeAffidavitPoints = (value: unknown): AffidavitPoint[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const seen = new Set<string>();
    const rows: AffidavitPoint[] = [];

    value.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const raw = item as { code?: unknown; label?: unknown };
      const code = String(raw.code || "").trim();
      const label = String(raw.label || "").trim();

      if (!code || !label || seen.has(code)) {
        return;
      }

      seen.add(code);
      rows.push({ code, label });
    });

    return rows;
  };

  const fetchAffidavitTemplates = async () => {
    try {
      const snapshot = await getDocs(collection(db, "affidavitTemplates"));
      const rows: AffidavitTemplate[] = snapshot.docs
        .map((item) => {
          const data = item.data() as {
            category?: string;
            points?: unknown;
          };

          const category = String(data.category || item.id || "").trim().toUpperCase();
          if (category !== "A" && category !== "B1" && category !== "B2") {
            return null;
          }

          const points = normalizeAffidavitPoints(data.points);
          return {
            id: item.id,
            category,
            points: points.length > 0 ? points : DEFAULT_AFFIDAVIT_POINTS,
          } as AffidavitTemplate;
        })
        .filter((item): item is AffidavitTemplate => item !== null)
        .sort((a, b) => a.category.localeCompare(b.category));

      setAffidavitTemplates(rows);
    } catch (error) {
      console.error("Error fetching affidavit templates:", error);
    }
  };

  const handleAffidavitCategoryChange = (category: "A" | "B1" | "B2") => {
    setAffidavitCategory(category);
    const existing = affidavitTemplates.find((item) => item.category === category);
    setEditingAffidavitPoints(existing?.points || DEFAULT_AFFIDAVIT_POINTS);
  };

  const addAffidavitPoint = () => {
    const code = affidavitCodeInput.trim().toUpperCase();
    const label = affidavitLabelInput.trim();

    if (!code || !label) {
      alert("Affidavit code and label are required.");
      return;
    }

    if (editingAffidavitPoints.some((item) => item.code === code)) {
      alert("Affidavit code already exists for this category.");
      return;
    }

    setEditingAffidavitPoints((prev) => [...prev, { code, label }]);
    setAffidavitCodeInput("");
    setAffidavitLabelInput("");
  };

  const removeAffidavitPoint = (code: string) => {
    setEditingAffidavitPoints((prev) => prev.filter((item) => item.code !== code));
  };

  const saveAffidavitTemplate = async () => {
    if (editingAffidavitPoints.length === 0) {
      alert("At least one affidavit point is required.");
      return;
    }

    try {
      await setDoc(doc(db, "affidavitTemplates", affidavitCategory), {
        category: affidavitCategory,
        points: editingAffidavitPoints,
        updatedAt: serverTimestamp(),
      });

      await fetchAffidavitTemplates();
      alert("Affidavit template saved.");
    } catch (error) {
      console.error("Error saving affidavit template:", error);
      alert("Failed to save affidavit template.");
    }
  };

  const resetAffidavitPointsToDefault = () => {
    setEditingAffidavitPoints(DEFAULT_AFFIDAVIT_POINTS);
  };

  useEffect(() => {
    const existing = docConfigs.find((item) => item.category === docConfigCategory);
    setEditingRequirements(existing?.requiredDocuments || DEFAULT_REQUIRED_DOCUMENTS);
  }, [docConfigCategory, docConfigs]);

  useEffect(() => {
    const existing = affidavitTemplates.find((item) => item.category === affidavitCategory);
    setEditingAffidavitPoints(existing?.points || DEFAULT_AFFIDAVIT_POINTS);
  }, [affidavitCategory, affidavitTemplates]);

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

  const saveLocationHierarchy = async () => {
    const state = locationStateName.trim();
    const districts = locationDistricts
      .split(",")
      .map((item) => item.trim())
      .filter((item, index, arr) => item && arr.indexOf(item) === index);

    if (!state || districts.length === 0) {
      alert("State and at least one district are required.");
      return;
    }

    const docId = state.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      await setDoc(doc(db, "locationHierarchy", docId), {
        stateName: state,
        districts,
        updatedAt: serverTimestamp(),
      });
      setLocationStateName("");
      setLocationDistricts("");
      await fetchLocationHierarchy();
      alert("Location hierarchy saved.");
    } catch (error) {
      console.error("Error saving location hierarchy:", error);
      alert("Failed to save location hierarchy.");
    }
  };

  const seedAllIndiaLocations = async () => {
    setSeedingLocations(true);
    try {
      const statesWithDistricts = getAllStatesWithDistricts() as Array<{
        state?: { name?: string };
        name?: string;
        districts?: string[];
      }>;

      if (!statesWithDistricts.length) {
        alert("No state/district data found in the package.");
        return;
      }

      const batch = writeBatch(db);
      let validRows = 0;

      statesWithDistricts.forEach((row) => {
        const state = String(row.name || row.state?.name || "").trim();
        const districts = Array.isArray(row.districts)
          ? row.districts
              .map((item) => String(item).trim())
              .filter((item, index, arr) => item && arr.indexOf(item) === index)
          : [];

        if (!state || districts.length === 0) {
          return;
        }

        const docId = state.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        batch.set(doc(db, "locationHierarchy", docId), {
          stateName: state,
          districts,
          updatedAt: serverTimestamp(),
        });
        validRows += 1;
      });

      if (validRows === 0) {
        alert("No valid state/district rows available for seeding.");
        return;
      }

      await batch.commit();
      await fetchLocationHierarchy();
      alert(`Seeded ${validRows} states with districts into Firestore.`);
    } catch (error) {
      console.error("Error seeding India locations:", error);
      alert("Failed to seed India state and district data.");
    } finally {
      setSeedingLocations(false);
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
            <h2 className="text-xl font-semibold mb-4">State and District Hierarchy</h2>
            <div style={{ marginBottom: 12 }}>
              <button
                className="button"
                type="button"
                onClick={seedAllIndiaLocations}
                disabled={seedingLocations}
              >
                {seedingLocations ? "Seeding India Locations..." : "Seed All India States and Districts"}
              </button>
              <p style={{ color: "var(--muted)", marginTop: 8 }}>
                One-click seed uses the india-state-district package and overwrites matching state docs.
              </p>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>State Name</label>
                <input
                  className="input"
                  type="text"
                  value={locationStateName}
                  onChange={(e) => setLocationStateName(e.target.value)}
                  placeholder="e.g. Chhattisgarh"
                />
              </div>
              <div className="field">
                <label>Districts (comma separated)</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={locationDistricts}
                  onChange={(e) => setLocationDistricts(e.target.value)}
                  placeholder="e.g. Raipur, Bilaspur, Durg"
                />
              </div>
            </div>
            <button className="button" type="button" onClick={saveLocationHierarchy}>
              Save State and Districts
            </button>

            <div style={{ marginTop: 16 }}>
              {locations.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No locations configured yet.</p>
              ) : (
                locations.map((row) => (
                  <div key={row.id} className="card" style={{ marginTop: 10 }}>
                    <h3 style={{ marginTop: 0 }}>{row.stateName}</h3>
                    <p style={{ marginBottom: 0 }}>{row.districts.join(", ")}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Category-wise Mandatory Documents</h2>
            <div className="field">
              <label>Category</label>
              <select
                className="select"
                value={docConfigCategory}
                onChange={(e) => handleDocConfigCategoryChange(e.target.value as "A" | "B1" | "B2")}
              >
                <option value="A">A</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Document Key</label>
                <input
                  className="input"
                  type="text"
                  value={docKeyInput}
                  onChange={(e) => setDocKeyInput(e.target.value)}
                  placeholder="e.g. ecClearanceLetter"
                />
              </div>
              <div className="field">
                <label>Document Label</label>
                <input
                  className="input"
                  type="text"
                  value={docLabelInput}
                  onChange={(e) => setDocLabelInput(e.target.value)}
                  placeholder="e.g. EC Clearance Letter (PDF)"
                />
              </div>
            </div>

            <button className="button button-secondary" type="button" onClick={addRequiredDocument}>
              Add Required Document
            </button>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {editingRequirements.map((item) => (
                <div key={item.key} className="card" style={{ margin: 0 }}>
                  <p style={{ margin: 0 }}><strong>{item.key}</strong></p>
                  <p style={{ margin: "6px 0", color: "var(--muted)" }}>{item.label}</p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => removeRequiredDocument(item.key)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button className="button" type="button" onClick={saveCategoryDocumentConfig} style={{ marginTop: 12 }}>
              Save Category Requirements
            </button>

            <div style={{ marginTop: 16 }}>
              {docConfigs.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No category-specific requirements configured yet.</p>
              ) : (
                docConfigs.map((item) => (
                  <div key={item.id} className="card" style={{ marginTop: 10 }}>
                    <h3 style={{ marginTop: 0 }}>Category {item.category}</h3>
                    <ul style={{ marginBottom: 0 }}>
                      {item.requiredDocuments.map((docItem) => (
                        <li key={`${item.id}-${docItem.key}`}>
                          {docItem.key}: {docItem.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">EDS Point Bank</h2>
            <p style={{ color: "var(--muted)" }}>
              Scrutiny team will select from these codes while issuing EDS. Proponent can see selected codes during response.
            </p>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>EDS Code</label>
                <input
                  className="input"
                  type="text"
                  value={edsCodeInput}
                  onChange={(e) => setEdsCodeInput(e.target.value)}
                  placeholder="e.g. WATER_NOC"
                />
              </div>
              <div className="field">
                <label>EDS Label</label>
                <input
                  className="input"
                  type="text"
                  value={edsLabelInput}
                  onChange={(e) => setEdsLabelInput(e.target.value)}
                  placeholder="e.g. Submit water NOC"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button button-secondary" type="button" onClick={addEdsPoint}>
                Add EDS Point
              </button>
              <button className="button button-secondary" type="button" onClick={resetEdsPointsToDefault}>
                Reset to Default
              </button>
              <button className="button" type="button" onClick={saveEdsPointBank}>
                Save EDS Point Bank
              </button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {edsPoints.map((item) => (
                <div key={item.code} className="card" style={{ margin: 0 }}>
                  <p style={{ margin: 0 }}><strong>{item.code}</strong></p>
                  <p style={{ margin: "6px 0", color: "var(--muted)" }}>{item.label}</p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => removeEdsPoint(item.code)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Affidavit Templates</h2>
            <p style={{ color: "var(--muted)" }}>
              Configure category-wise affidavit declarations. Proponent must accept each point and upload notarized affidavit bundle.
            </p>

            <div className="field">
              <label>Category</label>
              <select
                className="select"
                value={affidavitCategory}
                onChange={(e) => handleAffidavitCategoryChange(e.target.value as "A" | "B1" | "B2")}
              >
                <option value="A">A</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Affidavit Code</label>
                <input
                  className="input"
                  type="text"
                  value={affidavitCodeInput}
                  onChange={(e) => setAffidavitCodeInput(e.target.value)}
                  placeholder="e.g. NO_OUTSIDE_MINING"
                />
              </div>
              <div className="field">
                <label>Affidavit Label</label>
                <input
                  className="input"
                  type="text"
                  value={affidavitLabelInput}
                  onChange={(e) => setAffidavitLabelInput(e.target.value)}
                  placeholder="e.g. No activity outside lease area"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button button-secondary" type="button" onClick={addAffidavitPoint}>
                Add Affidavit Point
              </button>
              <button className="button button-secondary" type="button" onClick={resetAffidavitPointsToDefault}>
                Reset to Default
              </button>
              <button className="button" type="button" onClick={saveAffidavitTemplate}>
                Save Affidavit Template
              </button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {editingAffidavitPoints.map((item) => (
                <div key={item.code} className="card" style={{ margin: 0 }}>
                  <p style={{ margin: 0 }}><strong>{item.code}</strong></p>
                  <p style={{ margin: "6px 0", color: "var(--muted)" }}>{item.label}</p>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => removeAffidavitPoint(item.code)}
                  >
                    Remove
                  </button>
                </div>
              ))}
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ marginRight: 8 }}
                          onClick={() =>
                            setSelectedApplicationId((prev) => (prev === app.id ? null : app.id))
                          }
                        >
                          {selectedApplicationId === app.id ? "Hide" : "View"}
                        </button>
                        <button
                          type="button"
                          className="button"
                          onClick={() => handleFinalApproval(app)}
                          disabled={app.status === "finalized"}
                        >
                          Final Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedApplication && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3 style={{ marginTop: 0 }}>{selectedApplication.projectName}</h3>
                <p style={{ margin: "6px 0" }}>
                  <strong>Status:</strong> {selectedApplication.status.replace("_", " ")}
                </p>
                <p style={{ margin: "6px 0" }}>
                  <strong>Description:</strong> {selectedApplication.description || "Not available"}
                </p>
                <div>
                  <strong>Documents:</strong>
                  {selectedApplication.documents?.length ? (
                    <ul style={{ marginTop: 8 }}>
                      {selectedApplication.documents.map((file, idx) => (
                        <li key={`${selectedApplication.id}-doc-${idx}`}>
                          {file.url ? (
                            <a href={file.url} target="_blank" rel="noreferrer">
                              {file.key || "document"}: {file.name || "Open"}
                            </a>
                          ) : (
                            <span>{file.key || "document"}: URL not available</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "var(--muted)", marginTop: 6 }}>No document links available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
