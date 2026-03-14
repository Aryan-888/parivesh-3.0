import type { DocumentCheckItem } from "@/lib/aiDecisionSupport";

interface ComplianceChecklistProps {
  items: DocumentCheckItem[];
  compliancePercentage: number;
}

export default function ComplianceChecklist({ items, compliancePercentage }: ComplianceChecklistProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Compliance Checklist</h4>
      <div className="mb-3">
        <p className="text-sm text-gray-700">Compliance Percentage</p>
        <p className="text-2xl font-bold text-blue-700">{compliancePercentage}%</p>
      </div>
      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <span className="text-gray-800">{item.name}</span>
            <span className={item.present ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
              {item.present ? "Compliant" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
