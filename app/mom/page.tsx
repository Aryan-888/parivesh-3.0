"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "../../components/ProtectedRoute";
import ApplicationTimeline from "../../components/ApplicationTimeline";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";
import {
  canTransition,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/workflow";
import {
  defaultTemplateForCategory,
  renderGistTemplate,
} from "@/lib/gist";

interface Application {
  id: string;
  projectName: string;
  location: string;
  description: string;
  category: string;
  sector: string;
  status: string;
  momText?: string;
  documents?: Array<{
    key?: string;
    name?: string;
    url?: string;
    contentType?: string;
  }>;
  eds?: {
    active?: boolean;
    codes?: string[];
    remarks?: string;
    responseNotes?: string;
    requestedAt?: string;
    respondedAt?: string;
    resubmissionCount?: number;
  };
  checklist?: {
    documentsVerified?: boolean;
    paymentVerified?: boolean;
    details?: string;
    lockedByScrutiny?: boolean;
    updatedAt?: string;
  };
  affidavits?: {
    acceptedCodes?: string[];
    points?: Array<{
      code?: string;
      label?: string;
    }>;
    bundle?: {
      name?: string;
      url?: string;
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
      } | null
    >;
  };
}

interface GistTemplate {
  category: "A" | "B1" | "B2";
  template: string;
}

interface SectorParameter {
  sectorName: string;
  defaultNotes: string;
}

const CONDITIONAL_REQUIREMENT_META = [
  { key: "nbwlApplicable", evidenceKey: "nbwlClearance", label: "NBWL Clearance" },
  { key: "wildlifePlanApplicable", evidenceKey: "wildlifeManagementPlan", label: "Wildlife Management Plan" },
  { key: "forestNocApplicable", evidenceKey: "forestNoc", label: "Forest NOC" },
  { key: "waterNocApplicable", evidenceKey: "waterNoc", label: "Water NOC / Permission" },
  { key: "droneVideoApplicable", evidenceKey: "droneEvidence", label: "Drone Evidence" },
  { key: "kmlApplicable", evidenceKey: "kmlEvidence", label: "KML / Boundary Evidence" },
];

const toSafeFileName = (value: string): string => {
  const normalized = (value || "project").trim().replace(/\s+/g, "_");
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]/g, "");
  return cleaned || "project";
};

export default function MoMDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [gists, setGists] = useState<{ [key: string]: string }>({});
  const [generatingGist, setGeneratingGist] = useState<{ [key: string]: boolean }>({});

  const getMissingAffidavitCodes = (app: Application): string[] => {
    const points = (app.affidavits?.points || []).map((item) => String(item.code || "").trim()).filter(Boolean);
    const accepted = new Set((app.affidavits?.acceptedCodes || []).map((item) => String(item || "").trim()).filter(Boolean));
    return points.filter((item) => !accepted.has(item));
  };

  const hasConditionalEvidence = (app: Application, evidenceKey: string): boolean => {
    if (app.conditionalCompliance?.evidence?.[evidenceKey]?.url) {
      return true;
    }

    return (app.documents || []).some(
      (docItem) => String(docItem.key || "").trim() === evidenceKey && !!docItem.url
    );
  };

  const getMissingConditionalEvidenceLabels = (app: Application): string[] => {
    return CONDITIONAL_REQUIREMENT_META
      .filter((item) => !!app.conditionalCompliance?.selections?.[item.key] && !hasConditionalEvidence(app, item.evidenceKey))
      .map((item) => item.label);
  };

  const buildComplianceSummaryText = (app: Application): string => {
    const docRows = (app.documents || []).map((item, index) => {
      const key = item.key || `document_${index + 1}`;
      const name = item.name || "Unnamed";
      const url = item.url || "URL not available";
      return `- ${key}: ${name} | ${url}`;
    });

    const conditionalRows = CONDITIONAL_REQUIREMENT_META.map((item) => {
      const applicable = !!app.conditionalCompliance?.selections?.[item.key];
      const status = !applicable
        ? "Not applicable"
        : hasConditionalEvidence(app, item.evidenceKey)
        ? "Applicable and evidence attached"
        : "Applicable but evidence missing";
      return `- ${item.label}: ${status}`;
    });

    const missingAffidavits = getMissingAffidavitCodes(app);
    const missingConditional = getMissingConditionalEvidenceLabels(app);
    const checklistReady = !!app.checklist?.documentsVerified && !!app.checklist?.paymentVerified;
    const affidavitReady = missingAffidavits.length === 0 && !!app.affidavits?.bundle?.url;
    const conditionalReady = missingConditional.length === 0;
    const overallReady = checklistReady && affidavitReady && conditionalReady;

    return [
      "PARIVESH Compliance Presentation Summary",
      "",
      `Overall Readiness: ${overallReady ? "READY FOR COMMITTEE REVIEW" : "FOLLOW-UP REQUIRED"}`,
      `Checklist Readiness: ${checklistReady ? "Compliant" : "Action Required"}`,
      `Affidavit Readiness: ${affidavitReady ? "Compliant" : "Action Required"}`,
      `Conditional Evidence Readiness: ${conditionalReady ? "Compliant" : "Action Required"}`,
      "",
      `Application ID: ${app.id}`,
      `Project Name: ${app.projectName}`,
      `Location: ${app.location}`,
      `Category: ${app.category}`,
      `Sector: ${app.sector}`,
      `Current Status: ${app.status}`,
      "",
      "Scrutiny Closure Snapshot",
      `- EDS Codes: ${(app.eds?.codes || []).length ? (app.eds?.codes || []).join(", ") : "None"}`,
      `- EDS Remarks: ${app.eds?.remarks || "Not provided"}`,
      `- PP Response: ${app.eds?.responseNotes || "Not provided"}`,
      `- Resubmissions: ${app.eds?.resubmissionCount || 0}`,
      `- Checklist Documents Verified: ${app.checklist?.documentsVerified ? "Compliant" : "Action Required"}`,
      `- Checklist Payment Verified: ${app.checklist?.paymentVerified ? "Compliant" : "Action Required"}`,
      `- Checklist Notes: ${app.checklist?.details || "Not provided"}`,
      "",
      "Affidavit Compliance",
      `- Accepted Declarations: ${(app.affidavits?.acceptedCodes || []).length}`,
      `- Total Declarations: ${(app.affidavits?.points || []).length}`,
      `- Missing Declarations: ${missingAffidavits.length ? missingAffidavits.join(", ") : "None"}`,
      `- Affidavit Bundle: ${app.affidavits?.bundle?.url ? "Uploaded" : "Not uploaded"}`,
      `- Affidavit Bundle Link: ${app.affidavits?.bundle?.url || "Not available"}`,
      "",
      "Conditional Regulatory Evidence",
      ...conditionalRows,
      `- Missing Conditional Evidence: ${missingConditional.length ? missingConditional.join(", ") : "None"}`,
      "",
      "Uploaded Forms and Evidence Links",
      ...(docRows.length ? docRows : ["- No documents available"]),
      "",
      "MoM Gist",
      app.momText || gists[app.id] || "No meeting text available.",
    ].join("\n");
  };

  const downloadTextFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadComplianceSummary = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) {
      return;
    }

    const summary = buildComplianceSummaryText(app);
    downloadTextFile(`Compliance_Summary_${toSafeFileName(app.projectName)}.txt`, summary, "text/plain;charset=utf-8");
  };

  const handleDownloadComplianceBundleJson = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) {
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      applicationId: app.id,
      projectName: app.projectName,
      category: app.category,
      sector: app.sector,
      status: app.status,
      eds: app.eds || {},
      checklist: app.checklist || {},
      affidavits: app.affidavits || {},
      conditionalCompliance: app.conditionalCompliance || {},
      documents: app.documents || [],
      momText: app.momText || gists[app.id] || "",
      complianceSummaryText: buildComplianceSummaryText(app),
    };

    downloadTextFile(
      `Compliance_Bundle_${toSafeFileName(app.projectName)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
  };

  const getTemplateForCategory = async (category: string): Promise<string> => {
    const normalized = ["A", "B1", "B2"].includes(category) ? category : "A";
    const templateRef = doc(db, "gistTemplates", normalized);
    const snapshot = await getDoc(templateRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as GistTemplate;
      return data.template;
    }

    return defaultTemplateForCategory(normalized);
  };

  const getSectorNotes = async (sector: string): Promise<string> => {
    const sectorKey = sector.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const sectorRef = doc(db, "sectorParameters", sectorKey);
    const snapshot = await getDoc(sectorRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as SectorParameter;
      return data.defaultNotes;
    }

    const fallback = await getDocs(
      query(collection(db, "sectorParameters"), where("sectorName", "==", sector))
    );

    if (!fallback.empty) {
      const data = fallback.docs[0].data() as SectorParameter;
      return data.defaultNotes;
    }

    return "No sector-specific notes configured by admin.";
  };

  const generateTemplateGist = async (app: Application): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const template = await getTemplateForCategory(app.category);
    const sectorNotes = await getSectorNotes(app.sector);

    return renderGistTemplate(template, {
      projectName: app.projectName,
      location: app.location,
      category: app.category,
      sector: app.sector,
      description: app.description,
      sectorNotes,
    });
  };

  const fetchApplications = async () => {
    try {
      const q = query(
        collection(db, "applications"),
        where("status", "in", ["referred", "mom_generated"])
      );
      const querySnapshot = await getDocs(q);
      const apps: Application[] = querySnapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Application, "id">),
      }));
      setApplications(apps);

      const initialGists: { [key: string]: string } = {};
      for (const app of apps) {
        if ((app.momText || "").trim()) {
          initialGists[app.id] = app.momText || "";
          continue;
        }

        try {
          initialGists[app.id] = await generateTemplateGist(app);
        } catch (error) {
          console.error("Template gist generation failed, using fallback:", error);
          initialGists[app.id] = defaultTemplateForCategory(app.category);
        }
      }
      setGists(initialGists);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemplateGist = async (id: string) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;

    setGeneratingGist((prev) => ({ ...prev, [id]: true }));

    try {
      const generated = await generateTemplateGist(app);
      setGists((prev) => ({
        ...prev,
        [id]: generated,
      }));
    } catch (error) {
      console.error("Error generating template gist:", error);
      alert("Failed to generate gist from template.");
    } finally {
      setGeneratingGist((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSaveMoM = async (id: string) => {
    try {
      const existing = applications.find((app) => app.id === id);

      if (!existing || !isApplicationStatus(existing.status)) {
        alert("Invalid application status.");
        return;
      }

      if (!canTransition(existing.status, "mom_generated")) {
        alert(`Transition not allowed: ${existing.status} -> mom_generated`);
        return;
      }

      const momText = gists[id] || "";
      const appRef = doc(db, "applications", id);
      await updateDoc(appRef, {
        momText,
        status: "mom_generated",
        updatedAt: new Date().toISOString(),
      });
      alert("MoM saved successfully.");
      await fetchApplications();
    } catch (error) {
      console.error("Error saving MoM:", error);
      alert("Failed to save MoM.");
    }
  };

  const handleFinalizeMoM = async (id: string) => {
    try {
      const existing = applications.find((app) => app.id === id);

      if (!existing || !isApplicationStatus(existing.status)) {
        alert("Invalid application status.");
        return;
      }

      if (!canTransition(existing.status as ApplicationStatus, "finalized")) {
        alert(`Transition not allowed: ${existing.status} -> finalized`);
        return;
      }

      const appRef = doc(db, "applications", id);
      await updateDoc(appRef, {
        status: "finalized",
        updatedAt: new Date().toISOString(),
      });
      alert("MoM finalized successfully.");
      await fetchApplications();
    } catch (error) {
      console.error("Error finalizing MoM:", error);
      alert("Failed to finalize MoM.");
    }
  };

  const handleDownloadPdf = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (app) {
      generatePdf(app);
    }
  };

  const handleDownloadDocx = async (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (app) {
      await generateDocx(app);
    }
  };

  const generateDocx = async (app: Application) => {
    const complianceSummary = buildComplianceSummaryText(app);

    const docxFile = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Minutes of Meeting",
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Project Name: ", bold: true }),
                new TextRun(app.projectName),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Location: ", bold: true }),
                new TextRun(app.location),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Sector: ", bold: true }),
                new TextRun(app.sector),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Category: ", bold: true }),
                new TextRun(app.category),
              ],
            }),
            new Paragraph({
              text: "Meeting Summary:",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun(app.momText || gists[app.id] || "No meeting text available.")],
            }),
            new Paragraph({
              text: "Compliance Summary:",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun(complianceSummary)],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(docxFile);
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MoM_${toSafeFileName(app.projectName)}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatePdf = (app: Application) => {
    const complianceSummary = buildComplianceSummaryText(app);
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Minutes of Meeting", 20, 30);

    pdf.setFontSize(12);
    pdf.text(`Project Name: ${app.projectName}`, 20, 50);
    pdf.text(`Location: ${app.location}`, 20, 60);
    pdf.text(`Sector: ${app.sector}`, 20, 70);
    pdf.text(`Category: ${app.category}`, 20, 80);

    pdf.setFontSize(14);
    pdf.text("Meeting Summary:", 20, 100);

    pdf.setFontSize(12);
    const summaryText = app.momText || gists[app.id] || "No meeting text available.";
    const splitText = pdf.splitTextToSize(summaryText, 170);
    pdf.text(splitText, 20, 110);

    const complianceText = pdf.splitTextToSize(`Compliance Summary\n${complianceSummary}`, 170);
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.text(complianceText, 20, 20);

    pdf.save(`MoM_${toSafeFileName(app.projectName)}.pdf`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setApplications([]);
        setGists({});
        setLoading(false);
        return;
      }

      setLoading(true);
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
    <ProtectedRoute allowedRole="mom">
      <main className="container">
        <header className="header">
          <div>
            <h1 className="title">Minutes of Meeting (MoM) Dashboard</h1>
            <p className="subtitle">
              Generate and finalize meeting minutes for referred applications.
            </p>
            <p className="text-sm" style={{ marginTop: 8, color: "var(--muted)" }}>
              Role Scope: Edit template-generated gist and finalize MoM; no scrutiny checklist modifications.
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <h3 className="text-xl font-semibold mb-4">{app.projectName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <p><strong>Location:</strong> {app.location}</p>
                <p><strong>Category:</strong> {app.category}</p>
                <p><strong>Sector:</strong> {app.sector}</p>
                <p><strong>Status:</strong> {app.status}</p>
              </div>
              <p className="mb-4"><strong>Description:</strong> {app.description}</p>

              <div className="card" style={{ marginBottom: 12 }}>
                <h4 className="text-sm font-semibold" style={{ marginTop: 0 }}>Scrutiny Inputs</h4>
                <p className="text-sm" style={{ marginBottom: 6 }}>
                  <strong>Scrutiny Remarks:</strong> {app.eds?.remarks || "Not provided"}
                </p>
                <p className="text-sm" style={{ marginBottom: 6 }}>
                  <strong>PP Response:</strong> {app.eds?.responseNotes || "Not provided"}
                </p>
                <p className="text-sm" style={{ marginBottom: 0 }}>
                  <strong>Checklist Notes:</strong> {app.checklist?.details || "Not provided"}
                </p>
              </div>

              <div className="mb-4">
                <ApplicationTimeline currentStatus={app.status} />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Meeting Gist</label>
                <textarea
                  className="textarea w-full"
                  rows={8}
                  value={gists[app.id] || ""}
                  onChange={(e) => setGists((prev) => ({ ...prev, [app.id]: e.target.value }))}
                  placeholder="Edit the meeting gist here..."
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleGenerateTemplateGist(app.id)}
                  disabled={generatingGist[app.id]}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingGist[app.id] ? "Generating..." : "Generate From Admin Template"}
                </button>
                <button
                  onClick={() => handleSaveMoM(app.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save MoM
                </button>
                <button
                  onClick={() => handleFinalizeMoM(app.id)}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Finalize MoM
                </button>
                <button
                  onClick={() => handleDownloadPdf(app.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => handleDownloadDocx(app.id)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                >
                  Download DOCX
                </button>
                <button
                  onClick={() => handleDownloadComplianceSummary(app.id)}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
                >
                  Download Presentation Summary (TXT)
                </button>
                <button
                  onClick={() => handleDownloadComplianceBundleJson(app.id)}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Download Compliance Bundle (JSON)
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </ProtectedRoute>
  );
}
