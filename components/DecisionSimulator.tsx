import type { DecisionSimulationResult } from "@/lib/aiDecisionSupport";

interface DecisionSimulatorProps {
  riskScore: number;
  complianceScore: number;
  result: DecisionSimulationResult;
}

export default function DecisionSimulator({ riskScore, complianceScore, result }: DecisionSimulatorProps) {
  const decisionClass =
    result.decision === "Approval"
      ? "text-emerald-700"
      : result.decision === "Conditional Approval"
      ? "text-amber-700"
      : "text-red-700";

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Committee Decision Simulator</h4>
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-gray-500">Risk Score</p>
          <p className="text-lg font-semibold text-gray-900">{riskScore}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-gray-500">Compliance Score</p>
          <p className="text-lg font-semibold text-gray-900">{complianceScore}%</p>
        </div>
      </div>
      <p className={`text-sm font-semibold mb-2 ${decisionClass}`}>Predicted Decision: {result.decision}</p>
      <p className="text-sm font-medium text-gray-700 mb-1">Suggested Environmental Conditions</p>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        {result.suggestedConditions.map((condition) => (
          <li key={condition}>{condition}</li>
        ))}
      </ul>
    </section>
  );
}
