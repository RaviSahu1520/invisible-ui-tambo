import { useState, useEffect } from "react";

export interface ChartViewProps {
  show?: boolean;
  title?: string;
  data?: number[];
  labels?: string[];
  type?: "bar" | "line" | "pie";
}

export function ChartView({
  show = true,
  title = "Chart",
  data = [40, 65],
  labels,
  type = "bar",
}: ChartViewProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  if (!show) return null;

  // Special handling for salary comparison (2 data points)
  const isSalaryComparison = data.length === 2 &&
    (labels?.[0]?.toLowerCase().includes("last") || labels?.[1]?.toLowerCase().includes("current"));

  if (isSalaryComparison && type === "bar") {
    const [lastMonth, currentMonth] = data;
    const maxValue = Math.max(lastMonth, currentMonth, 1);
    const difference = currentMonth - lastMonth;
    const percentChange = maxValue > 0 ? ((difference / lastMonth) * 100).toFixed(1) : "0";
    const isPositive = difference >= 0;

    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>

        <div className="space-y-6">
          {/* Last Month Bar */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Last Month
              </span>
              <span className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                ₹{lastMonth.toLocaleString()}
              </span>
            </div>
            <div className="h-10 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-400 transition-all duration-1000 ease-out"
                style={{ width: animate ? `${(lastMonth / maxValue) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Current Month Bar */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Current Month
              </span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                ₹{currentMonth.toLocaleString()}
              </span>
            </div>
            <div className="h-10 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out dark:bg-blue-600"
                style={{ width: animate ? `${(currentMonth / maxValue) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Difference Highlight */}
          {difference !== 0 && (
            <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-3 ${
              isPositive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
            }`}>
              <span className="text-2xl">
                {isPositive ? "↑" : "↓"}
              </span>
              <span className="text-lg font-semibold">
                {isPositive ? "+" : ""}₹{Math.abs(difference).toLocaleString()}
              </span>
              <span className="text-sm opacity-75">
                ({isPositive ? "+" : ""}{percentChange}%)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default bar chart for other data
  const max = Math.max(...data, 1);
  const defaultLabels = data.map((_, i) => `Item ${i + 1}`);
  const displayLabels = labels || defaultLabels;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="flex h-48 items-end justify-between gap-2">
        {data.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center">
            {type === "bar" && (
              <>
                <div className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  ₹{value.toLocaleString()}
                </div>
                <div
                  className="w-full rounded-t bg-blue-500 transition-all duration-700 ease-out dark:bg-blue-600"
                  style={{
                    height: animate ? `${(value / max) * 100}%` : "0%",
                    minHeight: animate ? "4px" : "0"
                  }}
                />
                <span className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {displayLabels[index]}
                </span>
              </>
            )}
            {type === "line" && (
              <div className="flex h-full w-full items-center">
                <div
                  className="h-2 rounded-full bg-blue-500 dark:bg-blue-600"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Show empty state message if data is all zeros */}
      {data.every((v) => v === 0) && (
        <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No data to display. Enter values to see comparison.
        </div>
      )}
    </div>
  );
}
