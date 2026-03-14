"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ApplicationTimeline from "@/components/ApplicationTimeline";
import RiskAnalysis from "@/components/RiskAnalysis";
import DocumentAnalysis from "@/components/DocumentAnalysis";
import AISummary from "@/components/AISummary";
import DecisionInsights from "@/components/DecisionInsights";
import DecisionSimulator from "@/components/DecisionSimulator";
import ComplianceChecklist from "@/components/ComplianceChecklist";
import GistGenerator from "@/components/GistGenerator";
import {
  analyzeDocumentCompleteness,
  calculateEnvironmentalRisk,
  computeComplianceChecklist,
  generateApplicationSummary,
  generateMeetingGist,
  getDecisionInsights,
  simulateCommitteeDecision,
  type UploadedDocument,
} from "@/lib/aiDecisionSupport";
import ProtectedRoute from "../../components/ProtectedRoute";

interface Application {
  id: string;
  projectName: string;
  location: string;
  description: string;
  status: string;
  documents?: UploadedDocument[];
  createdAt?: unknown;
}

export default function TrackApplication() {
  const [applicationId, setApplicationId] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loadingMyApplications, setLoadingMyApplications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatCreatedAt = (value: unknown): string => {
    if (!value) return "-";

    if (typeof value === "object" && value !== null && "toDate" in (value as { toDate?: unknown })) {
      const converter = (value as { toDate?: () => Date }).toDate;
      if (typeof converter === "function") {
        return converter().toLocaleDateString();
      }
    }

    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }
      return value;
    }

    return String(value);
  };

  const createdAtNumeric = (value: unknown): number => {
    if (!value) return 0;

    if (typeof value === "object" && value !== null && "toDate" in (value as { toDate?: unknown })) {
      const converter = (value as { toDate?: () => Date }).toDate;
      if (typeof converter === "function") {
        return converter().getTime();
      }
    }

    if (typeof value === "string") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    return 0;
  };

  const sortedMyApplications = useMemo(
    () => [...myApplications].sort((a, b) => createdAtNumeric(b.createdAt) - createdAtNumeric(a.createdAt)),
    [myApplications]
  );

  const riskAnalysis = useMemo(
    () => (application ? calculateEnvironmentalRisk(application.status) : null),
    [application]
  );

  const documentAnalysis = useMemo(
    () => analyzeDocumentCompleteness(application?.documents || []),
    [application]
  );

  const aiSummary = useMemo(
    () =>
      application
        ? generateApplicationSummary(application.projectName, application.location, application.status)
        : "",
    [application]
  );

  const decisionInsights = useMemo(
    () => getDecisionInsights(application?.status || ""),
    [application]
  );

  const complianceChecklist = useMemo(
    () => computeComplianceChecklist(application?.documents || []),
    [application]
  );

  const committeeRiskScore = useMemo(
    () => (riskAnalysis ? Math.max(0, 100 - riskAnalysis.score) : 100),
    [riskAnalysis]
  );

  const decisionSimulation = useMemo(
    () => simulateCommitteeDecision(committeeRiskScore, complianceChecklist.compliancePercentage),
    [committeeRiskScore, complianceChecklist.compliancePercentage]
  );

  const meetingGist = useMemo(
    () =>
      application && riskAnalysis
        ? generateMeetingGist({
            projectName: application.projectName,
            location: application.location,
            riskLevel: riskAnalysis.level,
            complianceScore: complianceChecklist.compliancePercentage,
            recommendation: decisionInsights.recommendation,
          })
        : "",
    [application, riskAnalysis, complianceChecklist.compliancePercentage, decisionInsights.recommendation]
  );

  const fetchMyApplications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setMyApplications([]);
        return;
      }

      const myQuery = query(collection(db, "applications"), where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(myQuery);

      const rows: Application[] = querySnapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          projectName: data.projectName || "Untitled Project",
          location: data.location || "-",
          description: data.description || "-",
          status: data.status || "draft",
          documents: (data.documents || []) as UploadedDocument[],
          createdAt: data.createdAt,
        };
      });

      setMyApplications(rows);
    } catch (err) {
      console.error("Error fetching my applications:", err);
      setError("Failed to load your applications.");
    } finally {
      setLoadingMyApplications(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMyApplications([]);
        setApplication(null);
        setLoadingMyApplications(false);
        return;
      }

      setLoadingMyApplications(true);
      await fetchMyApplications();
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId.trim()) return;

    setLoading(true);
    setError("");
    setApplication(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        setError("Authentication required. Please log in again.");
        return;
      }

      const docRef = doc(db, "applications", applicationId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data.ownerId !== user.uid) {
          setError("Application not found");
          return;
        }

        setApplication({
          id: applicationId.trim(),
          projectName: data.projectName,
          location: data.location,
          description: data.description,
          status: data.status,
          documents: (data.documents || []) as UploadedDocument[],
          createdAt: data.createdAt,
        });
      } else {
        setError("Application not found");
      }
    } catch (err) {
      console.error("Error fetching application:", err);
      setError("Failed to fetch application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRole="proponent">
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Track Your Application</h1>
            <p className="mt-2 text-gray-600">Track all applications submitted from your account</p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Applications</h2>

            {loadingMyApplications ? (
              <p className="text-gray-600">Loading your applications...</p>
            ) : sortedMyApplications.length === 0 ? (
              <p className="text-gray-600">No applications found for your account yet.</p>
            ) : (
              <div className="space-y-3">
                {sortedMyApplications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left p-4 border border-gray-200 rounded-md hover:border-blue-400"
                    onClick={() => {
                      setApplication(item);
                      setApplicationId(item.id);
                      setError("");
                    }}
                  >
                    <p className="font-medium text-gray-900">{item.projectName}</p>
                    <p className="text-sm text-gray-600">Application ID: {item.id}</p>
                    <p className="text-sm text-gray-600">Location: {item.location}</p>
                    <p className="text-sm text-gray-600 capitalize">Status: {item.status.replace("_", " ")}</p>
                    <p className="text-sm text-gray-600">Created: {formatCreatedAt(item.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Search by Application ID</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700">
                  Application ID
                </label>
                <input
                  type="text"
                  id="applicationId"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your application ID"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Searching..." : "Track Application"}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {application && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Project Name:</span>
                    <p className="text-gray-900">{application.projectName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <p className="text-gray-900">{application.location}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-900">{application.description}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <p className="text-gray-900 capitalize">{application.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created Date:</span>
                    <p className="text-gray-900">{formatCreatedAt(application.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Application Progress</h3>
                  <ApplicationTimeline currentStatus={application.status} />
                </div>

                {riskAnalysis && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RiskAnalysis result={riskAnalysis} />
                    <DocumentAnalysis items={documentAnalysis.items} />
                    <AISummary summary={aiSummary} />
                    <DecisionInsights
                      recommendation={decisionInsights.recommendation}
                      suggestedAction={decisionInsights.suggestedAction}
                    />
                    <DecisionSimulator
                      riskScore={committeeRiskScore}
                      complianceScore={complianceChecklist.compliancePercentage}
                      result={decisionSimulation}
                    />
                    <ComplianceChecklist
                      items={complianceChecklist.items}
                      compliancePercentage={complianceChecklist.compliancePercentage}
                    />
                    <div className="lg:col-span-2">
                      <GistGenerator gist={meetingGist} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}