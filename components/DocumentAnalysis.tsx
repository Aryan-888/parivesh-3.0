import type { DocumentCheckItem } from "@/lib/aiDecisionSupport";

interface DocumentAnalysisProps {
  items: DocumentCheckItem[];
}

export default function DocumentAnalysis({ items }: DocumentAnalysisProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Document Completeness Analysis</h4>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-gray-800">{item.name}</span>
            <span className={item.present ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
              {item.present ? "✔ present" : "❌ missing"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
