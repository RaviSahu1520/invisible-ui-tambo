/**
 * Orchestrator Client Component
 *
 * Provides the main UI for user input and connects to the AI Orchestrator.
 * Handles form submissions and renders components based on AI decisions.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { UIRenderer } from "./UIRenderer";
import { useVisibleComponents, useUIControls } from "@/lib/use-ui-state";
import {
  processUserInput,
  handleFormSubmission,
  confirmDestructiveAction,
  cancelDestructiveAction,
  registerHandlers,
  clearHandlers,
  type OrchestratorAction,
} from "@/lib/ui-orchestrator";
import { dataStore, intentMemory } from "@/lib/ui-orchestrator";
import { DebugPanel, useDebugMode } from "./DebugPanel";

// Utility function for className merging (simple version of cn utility)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ToastType = "success" | "info";

interface Toast {
  message: string;
  type: ToastType;
}

type UIPhase = "EMPTY" | "ACTIVE";

interface OrchestratorClientProps {
  /** Optional initial greeting */
  greeting?: string;
  /** Optional placeholder text for input */
  placeholder?: string;
}

export function OrchestratorClient({
  greeting = "Ask me to show you something...",
  placeholder = "Try: 'Show me the comparison between my last month salary and current month salary'",
}: OrchestratorClientProps) {
  const components = useVisibleComponents();
  const { remove, clear: clearUI } = useUIControls();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<OrchestratorAction | null>(null);
  const [uiPhase, setUIPhase] = useState<UIPhase>("EMPTY");
  const [toast, setToast] = useState<Toast | null>(null);
  const [processingAction, setProcessingAction] = useState<string | undefined>();
  const { isEnabled: debugMode, debugData, updateDebugData, setIsEnabled: setDebugMode } = useDebugMode();

  // Helper to show toast notification
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Register handlers on mount
  useEffect(() => {
    const handlers = {
      onFormSubmit: async (formData: Record<string, string>) => {
        setIsProcessing(true);
        try {
          const action = await handleFormSubmission(formData);
          setLastAction(action);
          updateDebugDataForAction(action);
        } catch (error) {
          console.error("Error handling form submission:", error);
        } finally {
          setIsProcessing(false);
        }
      },
      onModalConfirm: (modalId: string) => {
        const action = confirmDestructiveAction(modalId);
        setLastAction(action);
        updateDebugDataForAction(action);
      },
      onModalCancel: (modalId: string) => {
        const action = cancelDestructiveAction(modalId);
        setLastAction(action);
        updateDebugDataForAction(action);
      },
      onEmptyStateAction: () => {
        const prompt = "Show me what you can do";
        setInput(prompt);
        handleSubmit(prompt);
      },
      onPredictAction: (input: string, label?: string) => {
        if (label) {
          handlePredictActionClick(input, label);
        } else {
          setInput(input);
          handleSubmit(input);
        }
      },
      onDismissPredictions: () => {
        remove("predictive-actions");
      },
      onToast: (message: string, type: ToastType) => {
        showToast(message, type);
      },
    };

    registerHandlers(handlers);

    return () => {
      clearHandlers();
    };
  }, [remove, showToast]);

  // Update debug data after each action
  const updateDebugDataForAction = useCallback((action: OrchestratorAction) => {
    // Gather intent memory data
    const intents = intentMemory.getIntents();
    const memoryIntents = intents.slice(-5).map((intent) => ({
      id: intent.id,
      type: intent.type,
      input: intent.input,
      componentIds: intent.componentIds,
      timestamp: intent.timestamp,
    }));

    const referencesObj: Record<string, string> = {};
    for (const [key, ref] of intentMemory.getReferences()) {
      referencesObj[key] = ref.componentId;
    }

    // Map component decisions to ensure confidence is a number
    const decisions = (action.debug?.componentDecisions || []).map((d) => ({
      ...d,
      confidence: d.confidence ?? 0,
    }));

    updateDebugData({
      reasoning: action.debug?.reasoning || "",
      componentDecisions: decisions,
      intentMemory: {
        intents: memoryIntents,
        references: referencesObj,
      },
      rawData: {
        componentCount: components.length,
        componentIds: components.map((c) => c.id),
        dataSummary: dataStore.getSourceSummary(),
      },
    });
  }, [components, updateDebugData]);

  // Handle user input submission
  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      setIsProcessing(true);
      setProcessingAction(undefined);
      setInput("");

      try {
        const action = await processUserInput(text);
        setLastAction(action);
        updateDebugDataForAction(action);
      } catch (error) {
        console.error("Error processing input:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, updateDebugDataForAction]
  );

  // Handle predictive action click with processing state
  const handlePredictActionClick = useCallback(
    async (input: string, label: string) => {
      if (isProcessing) return;

      setProcessingAction(label);
      setIsProcessing(true);
      setInput("");

      try {
        const action = await processUserInput(input);
        setLastAction(action);
        updateDebugDataForAction(action);
      } catch (error) {
        console.error("Error processing input:", error);
      } finally {
        setIsProcessing(false);
        setProcessingAction(undefined);
      }
    },
    [isProcessing, updateDebugDataForAction]
  );

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(input);
      }
    },
    [input, handleSubmit]
  );

  // Focus input when phase transitions to ACTIVE
  useEffect(() => {
    if (uiPhase === "ACTIVE") {
      const inputEl = document.getElementById("orchestrator-input");
      inputEl?.focus();
    }
  }, [uiPhase]);

  // Trigger phase transition on first interaction (click or keypress)
  useEffect(() => {
    if (uiPhase !== "EMPTY") return;

    const handleInteraction = () => {
      setUIPhase("ACTIVE");
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [uiPhase]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        {/* PHASE 0: EMPTY - Static, non-interactive card */}
        {uiPhase === "EMPTY" && (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="max-w-md rounded-lg border border-zinc-200 bg-white/80 px-8 py-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  The interface will adapt to your intent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 1: ACTIVE - Input box only */}
        {uiPhase === "ACTIVE" && (
          <>
            {/* Optional subtle header */}
            {lastAction && (
              <div className="mb-6 text-center">
                <h1 className="mb-2 text-xl font-medium text-zinc-700 dark:text-zinc-300">
                  AI UI Orchestrator
                </h1>
              </div>
            )}

            {/* Input Area */}
            <div className="mb-6">
              <div className="relative">
                <input
                  id="orchestrator-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 pr-12 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
                />
                {isProcessing && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500 dark:border-zinc-700 dark:border-t-blue-400" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Press Enter to submit</span>
                {lastAction && (
                  <span>
                    {lastAction.render.length} rendered, {lastAction.remove.length} removed,{" "}
                    {lastAction.update.length} updated
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* PHASE 2: ORCHESTRATED - Only components returned by orchestrator */}
        {lastAction && (
          <div className="space-y-4">
            <UIRenderer components={components} processingAction={processingAction} />
          </div>
        )}

        {/* Debug Info (development only, only after orchestrator response) */}
        {process.env.NODE_ENV === "development" && lastAction && components.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
              Debug: Current Components
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-zinc-100 p-4 text-xs dark:bg-zinc-900">
              {JSON.stringify(components, null, 2)}
            </pre>
          </details>
        )}

        {/* Reset button for testing (only after orchestrator response) */}
        {process.env.NODE_ENV === "development" && lastAction && (
          <button
            type="button"
            onClick={() => {
              dataStore.clear();
              intentMemory.clear();
              clearUI();
              setUIPhase("EMPTY");
              setLastAction(null);
              setInput("");
            }}
            className="mt-4 text-xs text-zinc-400 underline dark:text-zinc-600"
          >
            Reset Everything
          </button>
        )}
      </div>

      {/* Debug Panel - only shown when explicitly toggled */}
      {debugMode && (
        <DebugPanel
          show={debugMode}
          onClose={() => setDebugMode(false)}
          reasoning={debugData.reasoning}
          componentDecisions={debugData.componentDecisions}
          intentMemory={debugData.intentMemory}
          rawData={debugData.rawData}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom fade-in duration-300",
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
          )}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" && (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
