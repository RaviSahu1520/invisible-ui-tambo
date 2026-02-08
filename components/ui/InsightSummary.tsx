export interface Insight {
  title: string;
  description: string;
  type?: "info" | "success" | "warning" | "error";
}

export interface InsightSummaryProps {
  show?: boolean;
  insights: Insight[];
}

const typeStyles = {
  info: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  success: "border-green-500 bg-green-50 dark:bg-green-950/30",
  warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
  error: "border-red-500 bg-red-50 dark:bg-red-950/30",
};

export function InsightSummary({ show = true, insights }: InsightSummaryProps) {
  if (!show) return null;

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`border-l-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${
            insight.type ? typeStyles[insight.type] : ""
          }`}
        >
          <h4 className="font-semibold">{insight.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
        </div>
      ))}
    </div>
  );
}
