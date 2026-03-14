import type { RiskAnalysisResult } from "@/lib/aiDecisionSupport";

interface RiskAnalysisProps {
  result: RiskAnalysisResult;
}

export default function RiskAnalysis({ result }: RiskAnalysisProps) {
  const levelClass =
    result.level === "High"
      ? "text-red-700 bg-red-50"
      : result.level === "Medium"
      ? "text-amber-700 bg-amber-50"
      : "text-emerald-700 bg-emerald-50";

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Environmental Risk Analysis</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-md bg-blue-50">
          <p className="text-xs text-blue-700 uppercase tracking-wide">Compliance Score</p>
          <p className="text-2xl font-bold text-blue-900">{result.score}</p>
        </div>
        <div className={`p-3 rounded-md ${levelClass}`}>
          <p className="text-xs uppercase tracking-wide">Risk Level</p>
          <p className="text-2xl font-bold">{result.level}</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Reasons</p>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
