"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "../../components/ProtectedRoute";
import ApplicationTimeline from "../../components/ApplicationTimeline";
import {
  canTransition,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/workflow";

interface Application {
  id: string;
  projectName: string;
  location: string;
  description: string;
  status: string;
  category?: "A" | "B1" | "B2" | string;
  ownerEmail?: string;
  documents?: Array<{
    key?: string;
    name?: string;
    url?: string;
    contentType?: string;
  }>;
  payment?: {
    method?: "upi" | "qr";
    reference?: string;
    status?: "verified" | "pending";
    verifiedAt?: string;
  };
  checklist?: {
    documentsVerified?: boolean;
    paymentVerified?: boolean;
    details?: string;
    lockedByScrutiny?: boolean;
    updatedAt?: string;
  };
  eds?: {
    active?: boolean;
    remarks?: string;
    codes?: string[];
    requestedAt?: string;
    responseNotes?: string;
    respondedAt?: string;
    resubmissionCount?: number;
  };
  affidavits?: {
    acceptedCodes?: string[];
    points?: AffidavitPoint[];
    bundle?: {
      key?: string;
      name?: string;
      url?: string;
      contentType?: string;
    } | null;
  };
  conditionalCompliance?: {
    selections?: Record<string, boolean>;
    evidence?: Record<
      string,
      {
        key?: string;
        name?: string;
        url?: string;
        contentType?: string;
      } | null
    >;
  };
}

interface ChecklistDraft {
  documentsVerified: boolean;
  paymentVerified: boolean;
  details: string;
}

interface ProcessingRunDocument {
  key?: string;
  ok?: boolean;
  error?: string;
  analysis?: {
    pageCount?: number | null;
    sizeBytes?: number;
  };
}

interface ProcessingRun {
  id: string;
  applicationId?: string;
  count?: number;
  okCount?: number;
  processedAt?: string;
  documents?: ProcessingRunDocument[];
}

interface RequiredDocumentDefinition {
  key: string;
  label: string;
}

interface EDSPoint {
  code: string;
  label: string;
}

interface AffidavitPoint {
  code: string;
  label: string;
}

interface ConditionalComplianceRequirement {
  key: string;
  label: string;
  evidenceKey: string;
  evidenceLabel: string;
}

const DEFAULT_REQUIRED_DOCUMENTS: RequiredDocumentDefinition[] = [
  { key: "eiaReport", label: "EIA Report (PDF)" },
  { key: "empPlan", label: "Environment Management Plan - EMP (PDF)" },
  { key: "complianceReport", label: "Compliance Undertaking (PDF)" },
];

const DEFAULT_CATEGORY_REQUIREMENTS: Record<string, RequiredDocumentDefinition[]> = {
  A: DEFAULT_REQUIRED_DOCUMENTS,
  B1: DEFAULT_REQUIRED_DOCUMENTS,
  B2: DEFAULT_REQUIRED_DOCUMENTS,
};

const DEFAULT_EDS_POINTS: EDSPoint[] = [
  { code: "FEE_DETAILS", label: "Submit processing fee details." },
  { code: "PFR", label: "Submit pre-feasibility report (PFR)." },
  { code: "EMP", label: "Submit EMP document." },
  { code: "FORM_1_CAF", label: "Submit Form-1 / 1-M / CAF." },
  { code: "LAND_DOCS", label: "Submit land documents." },
  { code: "LOI", label: "Submit LOI / LOI extension copy." },
  { code: "MINING_PLAN", label: "Submit mining plan approval and approved plan." },
  { code: "CERT_200_500", label: "Submit 200m and 500m certificates." },
  { code: "GRAM_PANCHAYAT_NOC", label: "Submit Gram Panchayat NOC." },
  { code: "FOREST_WILDLIFE", label: "Submit forest / wildlife / NBWL clearances (if applicable)." },
  { code: "WATER_NOC", label: "Submit water NOC (CGWA / authority)." },
  { code: "CTE_CTO", label: "Submit CTE / CTO compliance report." },
  { code: "KML", label: "Submit KML with clear boundary." },
  { code: "DRONE_VIDEO", label: "Submit drone video of applied area." },
  { code: "AFFIDAVITS", label: "Submit all notarized affidavits." },
  { code: "GIST", label: "Submit GIST details." },
];

const DEFAULT_CONDITIONAL_REQUIREMENTS: ConditionalComplianceRequirement[] = [
  {
    key: "nbwlApplicable",
    label: "NBWL clearance applicable",
    evidenceKey: "nbwlClearance",
    evidenceLabel: "NBWL clearance document",
  },
  {
    key: "wildlifePlanApplicable",
    label: "Wildlife management plan applicable",
    evidenceKey: "wildlifeManagementPlan",
    evidenceLabel: "Wildlife management plan document",
  },
  {
    key: "forestNocApplicable",
    label: "Forest NOC applicable",
    evidenceKey: "forestNoc",
    evidenceLabel: "Forest NOC document",
  },
  {
    key: "waterNocApplicable",
    label: "Water NOC/permission applicable",
    evidenceKey: "waterNoc",
    evidenceLabel: "Water NOC/permission document",
  },
  {
    key: "droneVideoApplicable",
    label: "Drone evidence applicable",
    evidenceKey: "droneEvidence",
    evidenceLabel: "Drone evidence document",
  },
  {
    key: "kmlApplicable",
    label: "KML/boundary evidence applicable",
    evidenceKey: "kmlEvidence",
    evidenceLabel: "KML/boundary evidence document",
  },
];

const normalizeRequiredDocuments = (value: unknown): RequiredDocumentDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const rows: RequiredDocumentDefinition[] = [];

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

export default function ScrutinyDashboard() {
  const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [edsRemarks, setEdsRemarks] = useState<Record<string, string>>({});
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, ChecklistDraft>>({});
  const [processingHistory, setProcessingHistory] = useState<Record<string, ProcessingRun[]>>({});
  const [categoryRequirements, setCategoryRequirements] = useState<Record<string, RequiredDocumentDefinition[]>>(
    DEFAULT_CATEGORY_REQUIREMENTS
  );
  const [edsPointBank, setEdsPointBank] = useState<EDSPoint[]>(DEFAULT_EDS_POINTS);
  const [selectedEdsCodes, setSelectedEdsCodes] = useState<Record<string, string[]>>({});

  const getBackendAuthHeaders = async () => {
    const user = auth.currentUser;
    if (!user) {
      return {} as Record<string, string>;
    }

    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchProcessingHistory = async (appIds: string[]) => {
    if (!backendBaseUrl || appIds.length === 0) {
      setProcessingHistory({});
      return;
    }

    const entries = await Promise.all(
      appIds.map(async (appId) => {
        try {
          const response = await fetch(
            `${backendBaseUrl}/api/process-documents-history?applicationId=${encodeURIComponent(appId)}`,
            {
              headers: await getBackendAuthHeaders(),
            }
          );

          if (!response.ok) {
            return [appId, [] as ProcessingRun[]] as const;
          }

          const data = (await response.json()) as ProcessingRun[];
          return [appId, data] as const;
        } catch (error) {
          console.warn("Failed to fetch processing history for", appId, error);
          return [appId, [] as ProcessingRun[]] as const;
        }
      })
    );

    setProcessingHistory(Object.fromEntries(entries));
  };

  const fetchApplications = async () => {
    try {
      const q = query(
        collection(db, "applications"),
        where("status", "in", ["submitted", "under_scrutiny", "eds"])
      );
      const querySnapshot = await getDocs(q);
      const apps: Application[] = querySnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Application, "id">),
      }));
      setApplications(apps);

      const nextChecklistDrafts: Record<string, ChecklistDraft> = {};
      const nextEdsRemarks: Record<string, string> = {};
      const nextSelectedCodes: Record<string, string[]> = {};

      for (const app of apps) {
        nextChecklistDrafts[app.id] = {
          documentsVerified: app.checklist?.documentsVerified || false,
          paymentVerified: app.checklist?.paymentVerified || app.payment?.status === "verified",
          details: app.checklist?.details || "",
        };

        nextEdsRemarks[app.id] = app.eds?.remarks || "";
        nextSelectedCodes[app.id] = Array.isArray(app.eds?.codes)
          ? app.eds?.codes.map((item) => String(item).trim()).filter(Boolean)
          : [];
      }

      setChecklistDrafts(nextChecklistDrafts);
      setEdsRemarks(nextEdsRemarks);
      setSelectedEdsCodes(nextSelectedCodes);
      await fetchProcessingHistory(apps.map((item) => item.id));
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryRequirements = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categoryDocumentRequirements"));
      const map: Record<string, RequiredDocumentDefinition[]> = {
        ...DEFAULT_CATEGORY_REQUIREMENTS,
      };

      snapshot.docs.forEach((item) => {
        const data = item.data() as {
          category?: string;
          requiredDocuments?: unknown;
        };

        const category = String(data.category || item.id || "").trim().toUpperCase();
        if (!category) {
          return;
        }

        const normalized = normalizeRequiredDocuments(data.requiredDocuments);
        if (normalized.length > 0) {
          map[category] = normalized;
        }
      });

      setCategoryRequirements(map);
    } catch (error) {
      console.error("Error fetching category requirements:", error);
      setCategoryRequirements(DEFAULT_CATEGORY_REQUIREMENTS);
    }
  };

  const fetchEdsPointBank = async () => {
    try {
      const snapshot = await getDocs(collection(db, "edsPointBank"));
      const first = snapshot.docs[0];
      if (!first) {
        setEdsPointBank(DEFAULT_EDS_POINTS);
        return;
      }

      const data = first.data() as { points?: unknown };
      const points = normalizeEdsPoints(data.points);
      setEdsPointBank(points.length > 0 ? points : DEFAULT_EDS_POINTS);
    } catch (error) {
      console.error("Error fetching EDS point bank:", error);
      setEdsPointBank(DEFAULT_EDS_POINTS);
    }
  };

  const getRequiredDocumentsForApplication = (app: Application): RequiredDocumentDefinition[] => {
    const category = String(app.category || "A").trim().toUpperCase();
    return categoryRequirements[category] || DEFAULT_REQUIRED_DOCUMENTS;
  };

  const getMissingRequiredDocuments = (app: Application): RequiredDocumentDefinition[] => {
    const uploaded = new Set((app.documents || []).map((item) => String(item.key || "").trim()).filter(Boolean));
    return getRequiredDocumentsForApplication(app).filter((item) => !uploaded.has(item.key));
  };

  const getMissingAffidavitDeclarations = (app: Application): AffidavitPoint[] => {
    const points = Array.isArray(app.affidavits?.points) ? app.affidavits?.points : [];
    const accepted = new Set(
      Array.isArray(app.affidavits?.acceptedCodes)
        ? app.affidavits?.acceptedCodes.map((item) => String(item).trim()).filter(Boolean)
        : []
    );
    return points.filter((item) => !accepted.has(item.code));
  };

  const hasAffidavitBundle = (app: Application): boolean => {
    if (app.affidavits?.bundle?.url) {
      return true;
    }

    return (app.documents || []).some((item) => String(item.key || "").trim() === "affidavitBundle" && !!item.url);
  };

  const getMissingConditionalEvidence = (app: Application): ConditionalComplianceRequirement[] => {
    const selections = app.conditionalCompliance?.selections || {};
    const evidence = app.conditionalCompliance?.evidence || {};

    return DEFAULT_CONDITIONAL_REQUIREMENTS.filter((item) => {
      if (!selections[item.key]) {
        return false;
      }

      const hasStructuredEvidence = !!evidence[item.evidenceKey]?.url;
      const hasDocumentEvidence = (app.documents || []).some(
        (docItem) => String(docItem.key || "").trim() === item.evidenceKey && !!docItem.url
      );

      return !hasStructuredEvidence && !hasDocumentEvidence;
    });
  };

  const updateStatus = async (app: Application, newStatus: ApplicationStatus, extra: Record<string, unknown> = {}) => {
    try {
      if (!isApplicationStatus(app.status)) {
        alert("Invalid status transition.");
        return;
      }

      if (!canTransition(app.status, newStatus)) {
        alert(`Transition not allowed: ${app.status} -> ${newStatus}`);
        return;
      }

      if ((newStatus === "under_scrutiny" || newStatus === "referred") && app.payment?.status !== "verified") {
        alert("Fee payment must be verified before moving this application.");
        return;
      }

      if (newStatus === "referred") {
        const checklist = checklistDrafts[app.id];
        const missingDocs = getMissingRequiredDocuments(app);
        const missingAffidavits = getMissingAffidavitDeclarations(app);
        const missingConditionalEvidence = getMissingConditionalEvidence(app);

        if (missingDocs.length > 0) {
          alert(`Missing required documents: ${missingDocs.map((item) => item.label).join(", ")}`);
          return;
        }

        if (missingAffidavits.length > 0) {
          alert(`Missing affidavit acceptance: ${missingAffidavits.map((item) => item.code).join(", ")}`);
          return;
        }

        if (!hasAffidavitBundle(app)) {
          alert("Missing notarized affidavit bundle upload.");
          return;
        }

        if (missingConditionalEvidence.length > 0) {
          alert(
            `Missing conditional evidence: ${missingConditionalEvidence
              .map((item) => item.evidenceLabel)
              .join(", ")}`
          );
          return;
        }

        if (!checklist?.documentsVerified || !checklist?.paymentVerified) {
          alert("Checklist must confirm documents and payment verification before referral.");
          return;
        }
      }

      const nextExtra = { ...extra };
      if (newStatus === "referred") {
        const checklist = checklistDrafts[app.id];
        nextExtra.checklist = {
          documentsVerified: !!checklist?.documentsVerified,
          paymentVerified: !!checklist?.paymentVerified,
          details: checklist?.details || "",
          lockedByScrutiny: true,
          updatedAt: new Date().toISOString(),
        };
      }

      const appRef = doc(db, "applications", app.id);
      await updateDoc(appRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...nextExtra,
      });

      await fetchApplications();
    } catch (error) {
      console.error("Error updating status:", error);
      const code = (error as { code?: string })?.code;
      if (code === "permission-denied") {
        alert("Status update blocked by rules. Save checklist first, then retry the transition.");
      } else {
        alert("Failed to update status. Please try again.");
      }
    }
  };

  const saveChecklist = async (app: Application) => {
    try {
      const checklist = checklistDrafts[app.id];
      const missingDocs = getMissingRequiredDocuments(app);
      const missingAffidavits = getMissingAffidavitDeclarations(app);
      const missingConditionalEvidence = getMissingConditionalEvidence(app);

      if (!checklist) {
        alert("No checklist data found.");
        return;
      }

      if (checklist.documentsVerified && missingDocs.length > 0) {
        alert(`Cannot mark documents verified while required files are missing: ${missingDocs.map((item) => item.label).join(", ")}`);
        return;
      }

      if (checklist.documentsVerified && (missingAffidavits.length > 0 || !hasAffidavitBundle(app))) {
        alert("Cannot mark documents verified while affidavit declarations/bundle are incomplete.");
        return;
      }

      if (checklist.documentsVerified && missingConditionalEvidence.length > 0) {
        alert("Cannot mark documents verified while conditional regulatory evidence is incomplete.");
        return;
      }

      await updateDoc(doc(db, "applications", app.id), {
        checklist: {
          ...checklist,
          lockedByScrutiny: true,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });

      alert("Scrutiny checklist saved.");
      await fetchApplications();
    } catch (error) {
      console.error("Error saving checklist:", error);
      alert("Failed to save checklist.");
    }
  };

  const sendEDS = async (app: Application) => {
    const remarks = (edsRemarks[app.id] || "").trim();
    const codes = selectedEdsCodes[app.id] || [];

    if (!remarks && codes.length === 0) {
      alert("Select at least one EDS code or provide remarks before sending back.");
      return;
    }

    await updateStatus(app, "eds", {
      eds: {
        ...(app.eds || {}),
        active: true,
        remarks,
        codes,
        requestedAt: new Date().toISOString(),
      },
    });
  };

  const acceptResubmission = async (app: Application) => {
    await updateStatus(app, "under_scrutiny", {
      eds: {
        ...(app.eds || {}),
        active: false,
      },
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchCategoryRequirements();
      await fetchEdsPointBank();
      await fetchApplications();
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="container">
        <p>Loading applications...</p>
      </main>
    );
  }

  return (
    <ProtectedRoute allowedRole="scrutiny">
      <main className="container">
        <header className="header">
          <div>
            <h1 className="title">Scrutiny Dashboard</h1>
            <p className="subtitle">Verify documents, maintain checklist, issue EDS, and refer eligible cases.</p>
            <p className="text-sm" style={{ marginTop: 8, color: "var(--muted)" }}>
              Role Scope: Verification authority only; MoM cannot edit scrutiny checklist fields.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <h3 className="text-lg font-semibold mb-2">{app.projectName}</h3>
              <p className="text-sm text-gray-600 mb-1"><strong>Location:</strong> {app.location}</p>
              <p className="text-sm text-gray-600 mb-1"><strong>Category:</strong> {app.category || "A"}</p>
              <p className="text-sm text-gray-600 mb-1"><strong>Applicant:</strong> {app.ownerEmail || "N/A"}</p>
              <p className="text-sm text-gray-600 mb-2"><strong>Description:</strong> {app.description}</p>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Uploaded Documents</h4>
                <p className="text-xs" style={{ marginBottom: 8, color: "var(--muted)" }}>
                  Required for category {app.category || "A"}: {getRequiredDocumentsForApplication(app).map((item) => item.label).join(", ")}
                </p>
                {getMissingRequiredDocuments(app).length > 0 && (
                  <p className="text-xs" style={{ marginBottom: 8, color: "#f97316" }}>
                    Missing: {getMissingRequiredDocuments(app).map((item) => item.label).join(", ")}
                  </p>
                )}
                {app.documents?.length ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {app.documents.map((file, index) => (
                      <div key={`${app.id}-doc-${index}`} style={{ fontSize: "0.85rem" }}>
                        <strong>{file.key || `Document ${index + 1}`}:</strong>{" "}
                        {file.url ? (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#1d4ed8", textDecoration: "underline" }}
                          >
                            {file.name || "Open PDF"}
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>URL not available</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ margin: 0, color: "var(--muted)" }}>
                    No document links available on this application.
                  </p>
                )}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Affidavit Compliance</h4>
                <p className="text-xs" style={{ margin: "0 0 6px 0" }}>
                  Accepted: {(app.affidavits?.acceptedCodes || []).length} / {(app.affidavits?.points || []).length}
                </p>
                {getMissingAffidavitDeclarations(app).length > 0 && (
                  <p className="text-xs" style={{ margin: "0 0 6px 0", color: "#f97316" }}>
                    Missing Declarations: {getMissingAffidavitDeclarations(app).map((item) => item.code).join(", ")}
                  </p>
                )}
                {hasAffidavitBundle(app) ? (
                  <p className="text-xs" style={{ margin: 0, color: "#2ea043" }}>Affidavit bundle uploaded.</p>
                ) : (
                  <p className="text-xs" style={{ margin: 0, color: "#f97316" }}>Affidavit bundle missing.</p>
                )}
                {(app.affidavits?.bundle?.url || "") && (
                  <a href={app.affidavits?.bundle?.url || "#"} target="_blank" rel="noreferrer">
                    View affidavit bundle
                  </a>
                )}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Conditional Regulatory Evidence</h4>
                <p className="text-xs" style={{ margin: "0 0 6px 0", color: "var(--muted)" }}>
                  Applicable items selected by proponent must include evidence uploads.
                </p>
                <div style={{ display: "grid", gap: 4 }}>
                  {DEFAULT_CONDITIONAL_REQUIREMENTS.map((item) => {
                    const isApplicable = !!app.conditionalCompliance?.selections?.[item.key];
                    const hasEvidence =
                      !!app.conditionalCompliance?.evidence?.[item.evidenceKey]?.url ||
                      (app.documents || []).some(
                        (docItem) => String(docItem.key || "").trim() === item.evidenceKey && !!docItem.url
                      );

                    return (
                      <p key={item.key} className="text-xs" style={{ margin: 0 }}>
                        <strong>{item.label}:</strong>{" "}
                        {!isApplicable
                          ? "Not applicable"
                          : hasEvidence
                          ? "Applicable and evidence uploaded"
                          : "Applicable but evidence missing"}
                      </p>
                    );
                  })}
                </div>
                {getMissingConditionalEvidence(app).length > 0 && (
                  <p className="text-xs" style={{ marginTop: 6, color: "#f97316" }}>
                    Missing: {getMissingConditionalEvidence(app).map((item) => item.evidenceLabel).join(", ")}
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-2">
                <strong>Fee Payment:</strong>{" "}
                {app.payment?.status === "verified"
                  ? `Verified (${(app.payment?.method || "").toUpperCase()}${app.payment?.reference ? `: ${app.payment.reference}` : ""})`
                  : "Pending"}
              </p>

              <p className="text-sm mb-3">
                <strong>Status:</strong>{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    app.status === "submitted"
                      ? "bg-blue-100 text-blue-800"
                      : app.status === "under_scrutiny"
                      ? "bg-yellow-100 text-yellow-800"
                      : app.status === "eds"
                      ? "bg-green-100 text-green-800"
                      : app.status === "referred"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {app.status.replace("_", " ").toUpperCase()}
                </span>
              </p>

              <div className="mb-4">
                <ApplicationTimeline currentStatus={app.status} />
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Scrutiny Checklist</h4>
                <label className="flex items-center gap-2 text-sm" style={{ marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!checklistDrafts[app.id]?.documentsVerified}
                    onChange={(e) =>
                      setChecklistDrafts((prev) => ({
                        ...prev,
                        [app.id]: {
                          ...(prev[app.id] || { documentsVerified: false, paymentVerified: false, details: "" }),
                          documentsVerified: e.target.checked,
                        },
                      }))
                    }
                  />
                  Documents verified
                </label>

                <label className="flex items-center gap-2 text-sm" style={{ marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={!!checklistDrafts[app.id]?.paymentVerified}
                    onChange={(e) =>
                      setChecklistDrafts((prev) => ({
                        ...prev,
                        [app.id]: {
                          ...(prev[app.id] || { documentsVerified: false, paymentVerified: false, details: "" }),
                          paymentVerified: e.target.checked,
                        },
                      }))
                    }
                  />
                  Payment verified
                </label>

                <textarea
                  className="textarea w-full"
                  rows={3}
                  placeholder="Checklist notes"
                  value={checklistDrafts[app.id]?.details || ""}
                  onChange={(e) =>
                    setChecklistDrafts((prev) => ({
                      ...prev,
                      [app.id]: {
                        ...(prev[app.id] || { documentsVerified: false, paymentVerified: false, details: "" }),
                        details: e.target.value,
                      },
                    }))
                  }
                />

                <button className="button button-secondary" type="button" onClick={() => saveChecklist(app)}>
                  Save Checklist
                </button>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>EDS</h4>
                <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                  {edsPointBank.map((point) => (
                    <label key={point.code} className="flex items-start gap-2 text-xs" style={{ marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={(selectedEdsCodes[app.id] || []).includes(point.code)}
                        onChange={(e) => {
                          setSelectedEdsCodes((prev) => {
                            const current = prev[app.id] || [];
                            const next = e.target.checked
                              ? [...current, point.code]
                              : current.filter((item) => item !== point.code);
                            return {
                              ...prev,
                              [app.id]: next,
                            };
                          });
                        }}
                      />
                      <span>
                        <strong>{point.code}</strong>: {point.label}
                      </span>
                    </label>
                  ))}
                </div>
                <textarea
                  className="textarea w-full"
                  rows={3}
                  placeholder="Optional additional EDS remarks for proponent"
                  value={edsRemarks[app.id] || ""}
                  onChange={(e) => setEdsRemarks((prev) => ({ ...prev, [app.id]: e.target.value }))}
                />
                {(selectedEdsCodes[app.id] || []).length > 0 && (
                  <p className="text-xs" style={{ marginTop: 6, color: "var(--muted)" }}>
                    Selected Codes: {(selectedEdsCodes[app.id] || []).join(", ")}
                  </p>
                )}
                {app.eds?.responseNotes && (
                  <p className="text-sm" style={{ marginTop: 8 }}>
                    <strong>Latest PP Response:</strong> {app.eds.responseNotes}
                  </p>
                )}
                {app.eds?.resubmissionCount ? (
                  <p className="text-xs" style={{ color: "var(--muted)", marginTop: 4 }}>
                    Resubmissions: {app.eds.resubmissionCount}
                  </p>
                ) : null}
                <button className="button button-secondary" type="button" onClick={() => sendEDS(app)}>
                  Send EDS
                </button>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Backend Document Processing</h4>
                {processingHistory[app.id]?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {processingHistory[app.id].slice(0, 2).map((run) => (
                      <div key={run.id} className="card" style={{ margin: 0 }}>
                        <p className="text-xs" style={{ margin: 0, color: "var(--muted)" }}>
                          Processed: {run.processedAt ? new Date(run.processedAt).toLocaleString() : "Unknown"}
                        </p>
                        <p className="text-sm" style={{ margin: "6px 0" }}>
                          Success: {run.okCount || 0}/{run.count || 0}
                        </p>
                        <div style={{ display: "grid", gap: 4 }}>
                          {(run.documents || []).map((doc, idx) => (
                            <p key={`${run.id}-${idx}`} className="text-xs" style={{ margin: 0 }}>
                              {doc.key || "document"}: {doc.ok ? "OK" : `Failed (${doc.error || "Unknown"})`}
                              {doc.ok && typeof doc.analysis?.pageCount === "number"
                                ? ` • pages: ${doc.analysis.pageCount}`
                                : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ margin: 0, color: "var(--muted)" }}>
                    No backend processing run found yet for this application.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {app.status === "eds" ? (
                  <button
                    onClick={() => acceptResubmission(app)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Accept Resubmission
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(app, "under_scrutiny")}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Move Under Scrutiny
                  </button>
                )}

                <button
                  onClick={() => updateStatus(app, "referred")}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  Refer to Meeting
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </ProtectedRoute>
  );
}
