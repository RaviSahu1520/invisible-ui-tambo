/**
 * Debug Panel Component
 *
 * Shows internal AI reasoning, component render decisions, and intent memory.
 * Hidden by default - activated via keyboard shortcut (Ctrl+Shift+D) or URL param.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface DebugPanelProps {
  show?: boolean;
  onClose?: () => void;
  reasoning?: string;
  componentDecisions?: Array<{
    id: string;
    type: string;
    reason: string;
    confidence: number;
  }>;
  intentMemory?: {
    intents: Array<{
      id: string;
      type: string;
      input: string;
      componentIds: string[];
      timestamp: number;
    }>;
    references: Record<string, string>;
  };
  rawData?: Record<string, unknown>;
}

export function DebugPanel({
  show = false,
  onClose,
  reasoning = "",
  componentDecisions = [],
  intentMemory,
  rawData,
}: DebugPanelProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-lg border border-zinc-300 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-3 w-3 gap-0.5">
              <div className="h-3 w-0.5 animate-pulse bg-red-500" />
              <div className="h-3 w-0.5 animate-pulse bg-yellow-500 delay-75" />
              <div className="h-3 w-0.5 animate-pulse bg-green-500 delay-150" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
              Debug Panel
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close debug panel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* AI Reasoning */}
          {reasoning && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                AI Reasoning
              </h3>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm dark:bg-amber-950/30 dark:border-amber-800">
                <p className="text-amber-900 dark:text-amber-100">{reasoning}</p>
              </div>
            </section>
          )}

          {/* Component Decisions */}
          {componentDecisions.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                Component Decisions
              </h3>
              <div className="space-y-2">
                {componentDecisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">
                        {decision.type}
                      </span>
                      {decision.confidence !== undefined && (
                        <span className="text-xs text-zinc-400">
                          {Math.round(decision.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                      {decision.reason}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">ID: {decision.id}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Intent Memory */}
          {intentMemory && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                Intent Memory
              </h3>

              {/* References */}
              {Object.keys(intentMemory.references).length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-1 text-xs font-medium text-zinc-400">
                    Active References
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(intentMemory.references).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-full bg-blue-100 px-2 py-1 text-xs font-mono text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {key} → {value.slice(0, 12)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Intents */}
              {intentMemory.intents.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-zinc-400">
                    Recent Intents
                  </h4>
                  <div className="space-y-1">
                    {intentMemory.intents.slice(-5).map((intent) => (
                      <div
                        key={intent.id}
                        className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
                      >
                        <span className="font-mono text-zinc-500">
                          [{intent.type}]
                        </span>{" "}
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {intent.input}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Raw Data */}
          {rawData && Object.keys(rawData).length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                Raw Data
              </h3>
              <pre className="overflow-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
          Press <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 dark:border-zinc-700 dark:bg-zinc-800">Ctrl+Shift+D</kbd> to toggle
          {" • "}
          Add <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 dark:border-zinc-700 dark:bg-zinc-800">?debug=true</kbd> to URL
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage debug mode state
 */
export function useDebugMode() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [debugData, setDebugData] = useState<{
    reasoning: string;
    componentDecisions: Array<{
      id: string;
      type: string;
      reason: string;
      confidence: number;
    }>;
    intentMemory?: {
      intents: Array<{
        id: string;
        type: string;
        input: string;
        componentIds: string[];
        timestamp: number;
      }>;
      references: Record<string, string>;
    };
    rawData?: Record<string, unknown>;
  }>({
    reasoning: "",
    componentDecisions: [],
  });

  // Check URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "true") {
      setIsEnabled(true);
    }
  }, []);

  // Keyboard shortcut toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "d") {
        setIsEnabled((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateDebugData = useCallback((data: typeof debugData) => {
    setDebugData((prev) => ({ ...prev, ...data }));
  }, []);

  const clearDebugData = useCallback(() => {
    setDebugData({ reasoning: "", componentDecisions: [] });
  }, []);

  return {
    isEnabled,
    debugData,
    updateDebugData,
    clearDebugData,
    setIsEnabled,
  };
}
