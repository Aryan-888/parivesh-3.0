export interface UploadedDocument {
  key?: string;
  name?: string;
  url?: string;
  contentType?: string;
}

export interface RiskAnalysisResult {
  score: number;
  level: "Low" | "Medium" | "High";
  reasons: string[];
}

export interface DocumentCheckItem {
  name: string;
  present: boolean;
}

export interface DocumentAnalysisResult {
  items: DocumentCheckItem[];
  complianceScore: number;
}

export interface DecisionInsightResult {
  recommendation: string;
  suggestedAction: string;
}

export interface DecisionSimulationResult {
  decision: "Approval" | "Conditional Approval" | "Further Review Required";
  suggestedConditions: string[];
}

export interface ChecklistResult {
  items: DocumentCheckItem[];
  compliancePercentage: number;
}

const CATEGORY_RISK_SCORES: Record<string, number> = {
  a: 39,
  b1: 43,
  b2: 51,
};

export const getCategoryEnvironmentalRiskScore = (category: string): number | null => {
  const normalized = String(category || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return CATEGORY_RISK_SCORES[normalized] ?? null;
};

const REQUIRED_ENVIRONMENTAL_DOCUMENTS: Array<{ name: string; matchTerms: string[] }> = [
  {
    name: "Environmental Impact Report",
    matchTerms: ["environmentalimpactreport", "eiareport", "eia"],
  },
  {
    name: "Site Layout Map",
    matchTerms: ["sitelayoutmap", "layoutmap", "layout", "kml", "siteplan"],
  },
  {
    name: "Water Usage Report",
    matchTerms: ["waterusagereport", "waterusage", "waternoc", "waterreport"],
  },
  {
    name: "Pollution Control Plan",
    matchTerms: ["pollutioncontrolplan", "pollutionplan", "empplan", "emp"],
  },
];

const REGULATORY_CHECKLIST: Array<{ name: string; matchTerms: string[] }> = [
  ...REQUIRED_ENVIRONMENTAL_DOCUMENTS,
  {
    name: "Notarized Affidavit Bundle",
    matchTerms: ["affidavitbundle", "affidavit"],
  },
  {
    name: "KML / Boundary Evidence",
    matchTerms: ["kml", "boundary", "kmlevidence"],
  },
];

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const getDocumentTokens = (documents: UploadedDocument[]): string[] => {
  return documents.flatMap((doc) => {
    const key = normalize(String(doc.key || ""));
    const name = normalize(String(doc.name || ""));
    return [key, name].filter(Boolean);
  });
};

const hasDocument = (tokens: string[], terms: string[]): boolean => {
  const normalizedTerms = terms.map((term) => normalize(term));
  return tokens.some((token) => normalizedTerms.some((term) => token.includes(term)));
};

export const calculateEnvironmentalRisk = (status: string): RiskAnalysisResult => {
  const normalizedStatus = String(status || "").toLowerCase();
  let score = 100;
  const reasons: string[] = [];

  if (normalizedStatus === "eds") {
    score -= 30;
    reasons.push("EDS issued indicates unresolved compliance gaps.");
  }

  if (normalizedStatus === "under_scrutiny") {
    score -= 10;
    reasons.push("Application is still under active regulatory scrutiny.");
  }

  if (normalizedStatus === "referred") {
    score -= 5;
    reasons.push("Referred cases may still require committee clarifications.");
  }

  if (normalizedStatus === "draft") {
    score -= 25;
    reasons.push("Draft status indicates submission is incomplete.");
  }

  if (normalizedStatus === "submitted") {
    score -= 15;
    reasons.push("Submitted status is pending full scrutiny verification.");
  }

  if (normalizedStatus === "finalized") {
    reasons.push("Finalized status indicates major compliance stages are complete.");
  }

  score = Math.max(0, Math.min(100, score));

  let level: "Low" | "Medium" | "High" = "Low";
  if (score < 50) {
    level = "High";
  } else if (score < 80) {
    level = "Medium";
  }

  if (reasons.length === 0) {
    reasons.push("No major risk flags detected from status progression.");
  }

  return { score, level, reasons };
};

export const analyzeDocumentCompleteness = (documents: UploadedDocument[]): DocumentAnalysisResult => {
  const tokens = getDocumentTokens(documents);
  const items = REQUIRED_ENVIRONMENTAL_DOCUMENTS.map((doc) => ({
    name: doc.name,
    present: hasDocument(tokens, doc.matchTerms),
  }));

  const presentCount = items.filter((item) => item.present).length;
  const complianceScore = Math.round((presentCount / items.length) * 100);

  return { items, complianceScore };
};

export const generateApplicationSummary = (
  projectName: string,
  location: string,
  status: string
): string => {
  const normalizedStatus = String(status || "").replace(/_/g, " ").toLowerCase();
  return `This project titled ${projectName || "Unknown Project"} located in ${location || "Unknown Location"} is currently ${normalizedStatus}. The application is being monitored through the environmental clearance workflow for timely regulatory decision support.`;
};

export const getDecisionInsights = (status: string): DecisionInsightResult => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "draft") {
    return {
      recommendation: "Submission Pending",
      suggestedAction: "Applicant must submit the application with all required documents.",
    };
  }

  if (normalizedStatus === "submitted") {
    return {
      recommendation: "Scrutiny Review Required",
      suggestedAction: "Scrutiny team should start verification of documents and compliance details.",
    };
  }

  if (normalizedStatus === "eds") {
    return {
      recommendation: "Deficiency Closure Required",
      suggestedAction: "Applicant must upload missing documents and respond to EDS observations.",
    };
  }

  if (normalizedStatus === "referred") {
    return {
      recommendation: "Committee Processing",
      suggestedAction: "Proceed to committee meeting with compliance summary and supporting evidence.",
    };
  }

  if (normalizedStatus === "finalized") {
    return {
      recommendation: "Closure Complete",
      suggestedAction: "Archive application and maintain records for future audits.",
    };
  }

  if (normalizedStatus === "under_scrutiny") {
    return {
      recommendation: "Detailed Evaluation in Progress",
      suggestedAction: "Continue scrutiny checks and confirm checklist compliance before referral.",
    };
  }

  return {
    recommendation: "Workflow Update Required",
    suggestedAction: "Update status to proceed with the next regulatory action.",
  };
};

export const simulateCommitteeDecision = (
  riskScore: number,
  complianceScore: number
): DecisionSimulationResult => {
  if (riskScore < 40 && complianceScore > 80) {
    return {
      decision: "Approval",
      suggestedConditions: [
        "Maintain periodic environmental monitoring reports.",
        "Continue statutory compliance submissions.",
      ],
    };
  }

  if (riskScore < 70) {
    return {
      decision: "Conditional Approval",
      suggestedConditions: [
        "Submit quarterly compliance updates.",
        "Complete pending mitigation actions before next audit.",
        "Adhere to water and emission control plan milestones.",
      ],
    };
  }

  return {
    decision: "Further Review Required",
    suggestedConditions: [
      "Address all EDS and scrutiny deficiencies.",
      "Provide additional technical and environmental evidence.",
      "Re-evaluate application in subsequent committee cycle.",
    ],
  };
};

export const computeComplianceChecklist = (documents: UploadedDocument[]): ChecklistResult => {
  const tokens = getDocumentTokens(documents);
  const items = REGULATORY_CHECKLIST.map((item) => ({
    name: item.name,
    present: hasDocument(tokens, item.matchTerms),
  }));

  const presentCount = items.filter((item) => item.present).length;
  const compliancePercentage = Math.round((presentCount / items.length) * 100);

  return { items, compliancePercentage };
};

export const generateMeetingGist = (input: {
  projectName: string;
  location: string;
  riskLevel: "Low" | "Medium" | "High";
  complianceScore: number;
  recommendation: string;
}): string => {
  return `Meeting Brief: ${input.projectName} at ${input.location}. AI risk level is ${input.riskLevel} and current compliance score is ${input.complianceScore}%. Recommended decision path: ${input.recommendation}. Committee may proceed based on available evidence and pending conditions.`;
};
