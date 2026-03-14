interface DecisionInsightsProps {
  recommendation: string;
  suggestedAction: string;
}

export default function DecisionInsights({ recommendation, suggestedAction }: DecisionInsightsProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Decision Insights</h4>
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-gray-800">Recommendation: </span>
          <span className="text-gray-700">{recommendation}</span>
        </p>
        <p>
          <span className="font-medium text-gray-800">Suggested Action: </span>
          <span className="text-gray-700">{suggestedAction}</span>
        </p>
      </div>
    </section>
  );
}
