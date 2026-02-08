/**
 * UI Orchestrator
 *
 * Connects user text input to AI for intelligent UI component management.
 * The AI analyzes user intent and decides which components to render, update, or remove.
 */

import { uiEngine, type UIComponent } from "./ui-state-engine";
import { recordIntent, indexComponents, intentMemory } from "./intent-memory";
import {
  dataStore,
  processFormData,
  mapFormFieldToDataKey,
  getSalaryComparisonData,
  getSalaryCardsData,
  needsSalaryData,
} from "./data-store";
import {
  getPredictiveActions,
  buildPredictionContext,
  shouldShowPredictions,
  type PredictiveAction,
} from "./predictive-actions";

/**
 * AI Orchestrator Response
 */
export interface OrchestratorResponse {
  render: UIComponent[];
  remove: string[];
  update: Array<{ id: string; props: Record<string, unknown> }>;
  notes: string;
  debug?: {
    reasoning: string;
    componentDecisions: Array<{
      id: string;
      type: string;
      reason: string;
      confidence?: number;
    }>;
  };
}

/**
 * Orchestrator Action - combines component definitions with lifecycle actions
 */
export interface OrchestratorAction {
  render: UIComponent[];
  remove: string[];
  update: Array<{ id: string; props: Record<string, unknown> }>;
  debug?: {
    reasoning: string;
    componentDecisions: Array<{
      id: string;
      type: string;
      reason: string;
      confidence?: number;
    }>;
  };
}

/**
 * Handler registry for component callbacks
 */
type HandlerRegistry = {
  onFormSubmit?: (formData: Record<string, string>) => void;
  onModalConfirm?: (modalId: string) => void;
  onModalCancel?: (modalId: string) => void;
  onEmptyStateAction?: () => void;
  onPredictAction?: (input: string, label?: string) => void;
  onDismissPredictions?: () => void;
  onToast?: (message: string, type: "success" | "info") => void;
};

let handlerRegistry: HandlerRegistry = {};

/**
 * Register handlers for component callbacks
 */
export function registerHandlers(handlers: HandlerRegistry): void {
  handlerRegistry = { ...handlerRegistry, ...handlers };
}

/**
 * Clear all handlers
 */
export function clearHandlers(): void {
  handlerRegistry = {};
}

/**
 * Resolve natural language references like "this", "that", "the chart"
 * Returns the input with resolved component context for the AI
 */
function resolveReferences(userInput: string): string {
  const state = uiEngine.getState();
  const componentMap: Record<string, string> = {};

  // Build component type -> id map
  for (const [id, comp] of Object.entries(state)) {
    if (!componentMap[comp.type]) {
      componentMap[comp.type] = id;
    }
  }

  // Use intent memory to resolve references
  const resolvedIds = intentMemory.resolveReferencesInText(userInput, componentMap);

  // If we found a "this" or "that" reference, provide context to AI
  if (resolvedIds.length > 0) {
    const referencedComp = state[resolvedIds[0]];
    if (referencedComp) {
      // Annotate input with resolved component info
      return `${userInput} [referencing: ${referencedComp.type} id:${referencedComp.id}]`;
    }
  }

  return userInput;
}

/**
 * Context builder - provides current UI state and data availability to the AI
 */
function buildContext(userInput: string): string {
  const state = uiEngine.getState();
  const visibleComponents = Object.values(state).filter((c) => c.visible);

  let context = `CURRENT UI STATE:\n`;
  context += `Visible components (${visibleComponents.length}):\n`;

  for (const comp of visibleComponents.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    context += `  - ${comp.id} (${comp.type})\n`;
  }

  context += `\nAVAILABLE DATA:\n`;
  const lastMonthEntry = dataStore.withSource("salary.lastMonth");
  const currentMonthEntry = dataStore.withSource("salary.currentMonth");
  context += `  salary.lastMonth: ${lastMonthEntry ? `${lastMonthEntry.value} (${lastMonthEntry.source})` : "NOT SET"}\n`;
  context += `  salary.currentMonth: ${currentMonthEntry ? `${currentMonthEntry.value} (${currentMonthEntry.source})` : "NOT SET"}\n`;

  // Show computed values
  context += `  salary.change: ${dataStore.get("salary.change") ?? "NOT SET"}\n`;
  context += `  salary.changePercent: ${dataStore.get("salary.changePercent") ?? "NOT SET"}\n`;
  context += `  salary.trend: ${dataStore.get("salary.trend") ?? "NOT SET"}\n`;

  context += `\nUSER INPUT: "${userInput}"`;

  return context;
}

/**
 * Attach handlers to a component's props
 */
function attachHandlers(
  component: UIComponent,
  handlers: HandlerRegistry
): UIComponent {
  const props = { ...component.props };

  if (component.type === "InputForm" && handlers.onFormSubmit) {
    props.onSubmit = handlers.onFormSubmit;
  }

  if (component.type === "GuardrailModal") {
    if (handlers.onModalConfirm) {
      props.onConfirm = () => handlers.onModalConfirm?.(component.id);
    }
    if (handlers.onModalCancel) {
      props.onCancel = () => handlers.onModalCancel?.(component.id);
    }
  }

  if (component.type === "EmptyState" && handlers.onEmptyStateAction) {
    props.onAction = handlers.onEmptyStateAction;
  }

  if (component.type === "PredictiveActionBar") {
    // Wire the onActionClick handler to dispatch intents through the orchestrator
    if (handlers.onPredictAction) {
      props.onActionClick = handlers.onPredictAction;
    }
    if (handlers.onDismissPredictions) {
      props.onDismiss = handlers.onDismissPredictions;
    }
  }

  if (component.type === "ExportActions" && handlers.onToast) {
    // Wire export actions to show toast notification
    props.onExport = (format: string) => {
      handlers.onToast?.(`Report exported as ${format.toUpperCase()}`, "success");
    };
  }

  return { ...component, props };
}

/**
 * Parse AI response and execute UI actions
 */
function executeOrchestratorActions(response: OrchestratorResponse): OrchestratorAction {
  const actions: OrchestratorAction = {
    render: (response.render || []).map((comp) =>
      attachHandlers(comp, handlerRegistry)
    ),
    remove: response.remove || [],
    update: response.update || [],
    debug: response.debug,
  };

  // Execute remove actions
  for (const id of actions.remove) {
    uiEngine.dispatch({ type: "remove", id });
  }

  // Execute update actions
  for (const update of actions.update) {
    uiEngine.dispatch({ type: "update", id: update.id, props: update.props });
  }

  // Execute render actions
  for (const comp of actions.render) {
    uiEngine.dispatch({ type: "render", component: comp });
  }

  // Generate predictive actions based on new state
  const newState = uiEngine.getState();
  const visibleComponents = Object.values(newState).filter((c) => c.visible);
  const predictionContext = buildPredictionContext(visibleComponents, response.notes);
  const predictions = getPredictiveActions(predictionContext);

  // Add predictive action bar if confidence is high enough
  if (shouldShowPredictions(predictions)) {
    const predictiveAction: UIComponent = {
      id: "predictive-actions",
      type: "PredictiveActionBar",
      visible: true,
      props: {
        actions: predictions.map((p) => ({
          label: p.label,
          input: p.input,
          confidence: p.confidence,
        })),
      },
      order: 999, // Always show at the bottom
    };
    actions.render.push(predictiveAction);
    uiEngine.dispatch({ type: "render", component: predictiveAction });
  }

  // Record intent
  const affectedIds = [
    ...actions.remove,
    ...actions.update.map((u) => u.id),
    ...actions.render.map((c) => c.id),
  ];

  recordIntent(
    response.notes || "User request processed",
    "ui_orchestration",
    affectedIds,
    { response }
  );

  // Re-index components for intent reference resolution
  indexComponents(Object.values(uiEngine.getState()));

  return actions;
}

/**
 * AI Orchestrator Call
 *
 * DEMONSTRATION MODE: Uses simulated pattern matching for hackathon demo.
 *
 * PRODUCTION: Replace simulateAIResponse() with actual Tambo AI call:
 *   const tambo = useTambo();
 *   const result = await tambo.generate({ input: context });
 *   return JSON.parse(result);
 */
async function callAIOrchestrator(userInput: string): Promise<OrchestratorResponse> {
  const context = buildContext(userInput);

  // Simulated AI response for demonstration
  return simulateAIResponse(userInput, context);
}

/**
 * Helper to create debug data for a response
 */
function createDebugData(
  reasoning: string,
  componentDecisions: Array<{
    id: string;
    type: string;
    reason: string;
    confidence?: number;
  }>
): OrchestratorResponse["debug"] {
  return {
    reasoning,
    componentDecisions,
  };
}

/**
 * Simulated AI Response Function
 *
 * DEMONSTRATION: This function simulates AI-driven UI orchestration decisions
 * using pattern matching. In production, the Tambo SDK would handle this.
 *
 * The simulation demonstrates Generative UI principles:
 * - Intent-driven component rendering
 * - Incremental UI mutations (not full resets)
 * - Context-aware decisions based on current state
 *
 * Production integration would use Tambo's component registry and
 * intent understanding to generate these decisions dynamically.
 */
function simulateAIResponse(userInput: string, context: string): OrchestratorResponse {
  const lowerInput = userInput.toLowerCase();

  // Check for salary comparison request
  if (lowerInput.includes("salary") && (lowerInput.includes("comparison") || lowerInput.includes("compare") || (lowerInput.includes("last month") && lowerInput.includes("current month")))) {
    // Check if we need to collect salary data
    if (needsSalaryData()) {
      const hasLastMonth = dataStore.exists("salary.lastMonth");
      const hasCurrentMonth = dataStore.exists("salary.currentMonth");

      // Missing data - request via InputForm
      return {
        render: [
          {
            id: "salary-data-form",
            type: "InputForm",
            visible: true,
            props: {
              fields: [
                {
                  name: "lastMonthSalary",
                  label: "Last Month Salary",
                  type: "number",
                  placeholder: "Enter your last month salary",
                  required: !hasLastMonth,
                },
                {
                  name: "currentMonthSalary",
                  label: "Current Month Salary",
                  type: "number",
                  placeholder: "Enter your current month salary",
                  required: !hasCurrentMonth,
                },
              ],
              submitLabel: "Compare Salary",
            },
            order: 0,
          },
        ],
        remove: [],
        update: [],
        notes: "Collecting missing salary data for comparison",
        debug: createDebugData(
          "User requested salary comparison but salary data is missing. Rendering InputForm to collect required values.",
          [
            {
              id: "salary-data-form",
              type: "InputForm",
              reason: "Salary data not found in store. User must provide last month and current month values.",
              confidence: 1.0,
            },
          ]
        ),
      };
    }

    // Data exists - use computed values from data store
    const salaryData = getSalaryComparisonData();
    const cardsData = getSalaryCardsData();

    return {
      render: [
        {
          id: "salary-comparison-cards",
          type: "SummaryCards",
          visible: true,
          props: {
            cards: cardsData,
          },
          order: 0,
        },
        {
          id: "salary-comparison-chart",
          type: "ChartView",
          visible: true,
          props: {
            title: "Salary Comparison",
            data: [salaryData.lastMonth ?? 0, salaryData.currentMonth ?? 0],
            labels: ["Last Month", "Current Month"],
            type: "bar",
          },
          order: 1,
        },
      ],
      remove: ["empty-state", "salary-data-form"],
      update: [],
      notes: "Displayed salary comparison with available data",
      debug: createDebugData(
        `Salary data available. Rendering comparison: Last Month ($${salaryData.lastMonth ?? 0}) vs Current Month ($${salaryData.currentMonth ?? 0}). Change: ${salaryData.change && salaryData.change > 0 ? '+' : ''}${salaryData.change ?? 0} (${salaryData.changePercent ?? 0}%).`,
        [
          {
            id: "salary-comparison-cards",
            type: "SummaryCards",
            reason: "Display salary metrics with computed change and trend.",
            confidence: 0.95,
          },
          {
            id: "salary-comparison-chart",
            type: "ChartView",
            reason: "Visual comparison of the two salary values.",
            confidence: 0.9,
          },
        ]
      ),
    };
  }

  // Handle form submission completion
  if (lowerInput.includes("form submitted")) {
    // Form data was already stored by handleFormSubmission
    // Now render the comparison if data is available
    if (dataStore.hasSalaryData()) {
      const salaryData = getSalaryComparisonData();
      const cardsData = getSalaryCardsData();

      return {
        render: [
          {
            id: "salary-comparison-cards",
            type: "SummaryCards",
            visible: true,
            props: {
              cards: cardsData,
            },
            order: 0,
          },
          {
            id: "salary-comparison-chart",
            type: "ChartView",
            visible: true,
            props: {
              title: "Salary Comparison",
              data: [salaryData.lastMonth ?? 0, salaryData.currentMonth ?? 0],
              labels: ["Last Month", "Current Month"],
              type: "bar",
            },
            order: 1,
          },
        ],
        remove: ["salary-data-form"],
        update: [],
        notes: "Processed salary data and displayed comparison",
        debug: createDebugData(
          "Form submitted with salary data. Computing comparison and rendering visualization.",
          [
            {
              id: "salary-comparison-cards",
              type: "SummaryCards",
              reason: "Display computed salary metrics (change, percentage, trend).",
              confidence: 0.95,
            },
            {
              id: "salary-comparison-chart",
              type: "ChartView",
              reason: "Visual representation of salary comparison.",
              confidence: 0.9,
            },
          ]
        ),
      };
    }
  }

  // Export report request
  if (lowerInput.includes("export") && (lowerInput.includes("report") || lowerInput.includes("pdf") || lowerInput.includes("salary"))) {
    return {
      render: [
        {
          id: "export-success",
          type: "InsightSummary",
          visible: true,
          props: {
            insights: [{
              title: "Report Ready",
              description: "Salary comparison report has been prepared for export.",
              type: "success" as const,
            }]
          },
          order: 0,
        },
        {
          id: "export-actions",
          type: "ExportActions",
          visible: true,
          props: {
            formats: [
              { id: "pdf", label: "PDF" },
              { id: "csv", label: "CSV" }
            ]
          },
          order: 1,
        }
      ],
      remove: [],
      update: [],
      notes: "Export options displayed for salary comparison",
      debug: createDebugData("User requested export. Showing format options.", []),
    };
  }

  // View expenses request
  if (lowerInput.includes("expense") || lowerInput.includes("expenses")) {
    // Check if we have expense data
    const hasExpenseData = dataStore.exists("expenses.total");

    if (!hasExpenseData) {
      return {
        render: [
          {
            id: "expense-data-form",
            type: "InputForm",
            visible: true,
            props: {
              title: "Expense Information",
              description: "Enter your expense details to see a breakdown",
              fields: [
                { name: "totalExpenses", label: "Total Monthly Expenses", type: "number" as const, placeholder: "e.g., 35000", required: true },
                { name: "category", label: "Highest Category", type: "text" as const, placeholder: "e.g., Rent, Food, Transport", required: true }
              ],
              submitLabel: "Analyze Expenses"
            },
            order: 0,
          }
        ],
        remove: [],
        update: [],
        notes: "Collecting expense data for breakdown",
        debug: createDebugData("No expense data found. Requesting user input.", []),
      };
    }

    // Has expense data - show breakdown
    const totalExpenses = dataStore.get("expenses.total") ?? 0;
    const category = dataStore.get("expenses.category") ?? "Other";

    return {
      render: [
        {
          id: "expense-summary",
          type: "SummaryCards",
          visible: true,
          props: {
            cards: [
              { title: "Total Expenses", value: `₹${totalExpenses}`, trend: "neutral" as const },
              { title: "Top Category", value: `${category}`, trend: "neutral" as const }
            ]
          },
          order: 0,
        },
        {
          id: "expense-breakdown",
          type: "InsightSummary",
          visible: true,
          props: {
            insights: [{
              title: "Expense Breakdown",
              description: `Your highest spending category is ${category} at ₹${totalExpenses}. Consider tracking individual categories for better insights.`,
              type: "info" as const,
            }]
          },
          order: 1,
        }
      ],
      remove: ["expense-data-form"],
      update: [],
      notes: "Displayed expense breakdown",
      debug: createDebugData(`Showing expense analysis. Total: ₹${totalExpenses}`, []),
    };
  }

  // Clear/reset request
  if (lowerInput.includes("clear") || lowerInput.includes("reset") || lowerInput.includes("remove all")) {
    return {
      render: [
        {
          id: "confirm-clear",
          type: "GuardrailModal",
          visible: true,
          props: {
            title: "Clear All Components",
            message: "This will remove all components from the screen. This action cannot be undone.",
            confirmLabel: "Clear All",
            cancelLabel: "Cancel",
          },
          order: 0,
        },
      ],
      remove: [],
      update: [],
      notes: "Awaiting confirmation for destructive action",
      debug: createDebugData(
        "User requested to clear/reset all components. This is destructive - requiring confirmation.",
        [
          {
            id: "confirm-clear",
            type: "GuardrailModal",
            reason: "Destructive action detected. Must get explicit user confirmation.",
            confidence: 1.0,
          },
        ]
      ),
    };
  }

  // Destructive data requests - never execute directly, always show guardrail
  const destructivePatterns = [
    "delete all",
    "delete my data",
    "delete everything",
    "erase all",
    "erase everything",
    "erase my data",
    "remove all data",
    "remove my data",
    "remove everything",
    "destroy all",
    "destroy my data",
    "wipe all",
    "wipe everything",
    "wipe my data",
    "clear all data",
    "clear my data",
    "reset everything",
    "reset all data",
    "forget everything",
    "forget my data",
  ];

  const isDestructiveRequest = destructivePatterns.some((pattern) =>
    lowerInput.includes(pattern)
  );

  if (isDestructiveRequest) {
    // Check what data exists to provide specific warning
    const sourceSummary = dataStore.getSourceSummary();
    const hasUserData = sourceSummary.user > 0;
    const hasMockData = sourceSummary.mock > 0;

    let message = "This action will permanently delete your data. ";
    if (hasUserData) {
      message += `You have ${sourceSummary.user} user-provided data entries that will be lost. `;
    }
    if (hasMockData) {
      message += "Mock data will remain available for new sessions. ";
    }
    message += "This action cannot be undone.";

    return {
      render: [
        {
          id: "confirm-data-deletion",
          type: "GuardrailModal",
          visible: true,
          props: {
            title: "Delete All Data?",
            message,
            confirmLabel: "Delete Everything",
            cancelLabel: "Keep My Data",
          },
          order: 0,
        },
      ],
      remove: [],
      update: [],
      notes: "Awaiting confirmation for data deletion",
      debug: createDebugData(
        `Destructive data request detected. User has ${dataStore.getSourceSummary().user} entries. Showing guardrail modal.`,
        [
          {
            id: "confirm-data-deletion",
            type: "GuardrailModal",
            reason: "Data deletion is destructive. Must get explicit user confirmation.",
            confidence: 1.0,
          },
        ]
      ),
    };
  }

  // Confirm clear action
  if (lowerInput.includes("confirmed") || lowerInput.includes("confirm clear")) {
    const state = uiEngine.getState();
    const allIds = Object.keys(state);
    return {
      render: [
        {
          id: "empty-state",
          type: "EmptyState",
          visible: true,
          props: {
            title: "Screen Cleared",
            description: "All components have been removed.",
            actionLabel: "Start Over",
          },
          order: 0,
        },
      ],
      remove: [...allIds, "confirm-clear"],
      update: [],
      notes: "Cleared all components after confirmation",
      debug: createDebugData(
        "User confirmed clear action. Removing all components and resetting to empty state.",
        [
          {
            id: "empty-state",
            type: "EmptyState",
            reason: "Reset to initial state after confirmed clear action.",
            confidence: 1.0,
          },
        ]
      ),
    };
  }

  // Default: show empty state
  return {
    render: [
      {
        id: "empty-state",
        type: "EmptyState",
        visible: true,
        props: {
          title: "What would you like to see?",
          description: "Try asking for a salary comparison, chart, or summary.",
          actionLabel: "Get Started",
        },
        order: 0,
      },
    ],
    remove: [],
    update: [],
    notes: "Displayed empty state for new user",
    debug: createDebugData(
      "User input did not match any known patterns. Showing empty state with helpful suggestions.",
      [
        {
          id: "empty-state",
          type: "EmptyState",
          reason: "No specific intent recognized. Providing onboarding options.",
          confidence: 0.4,
        },
      ]
    ),
  };
}

/**
 * Main orchestrator function
 * Processes user input and updates UI accordingly
 */
export async function processUserInput(userInput: string): Promise<OrchestratorAction> {
  if (!userInput || userInput.trim().length === 0) {
    return { render: [], remove: [], update: [] };
  }

  try {
    // Resolve natural language references like "this", "that", "the chart"
    const resolvedInput = resolveReferences(userInput);
    const response = await callAIOrchestrator(resolvedInput);
    return executeOrchestratorActions(response);
  } catch (error) {
    console.error("Orchestrator error:", error);
    return {
      render: [
        {
          id: "error-state",
          type: "EmptyState",
          visible: true,
          props: {
            title: "Something went wrong",
            description: "Please try again.",
          },
          order: 0,
        },
      ],
      remove: [],
      update: [],
      debug: createDebugData(
        `Error processing request: ${error instanceof Error ? error.message : String(error)}`,
        [
          {
            id: "error-state",
            type: "EmptyState",
            reason: "Error occurred. Showing user-friendly error message.",
            confidence: 1.0,
          },
        ]
      ),
    };
  }
}

/**
 * Handle form submission
 * Called when an InputForm is submitted
 */
export async function handleFormSubmission(formData: Record<string, unknown>): Promise<OrchestratorAction> {
  // Map form field names to data store keys and process
  const mappedData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(formData)) {
    const dataKey = mapFormFieldToDataKey(key);
    mappedData[dataKey] = value;
  }

  // Store data using the hybrid data store
  processFormData(mappedData);

  // Trigger re-processing with form completion context
  const formContext = Object.entries(mappedData)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return processUserInput(`Form submitted with ${formContext}`);
}

/**
 * Confirm destructive action
 */
export function confirmDestructiveAction(actionId: string): OrchestratorAction {
  const actions: OrchestratorAction = {
    render: [],
    remove: [],
    update: [],
  };

  if (actionId === "confirm-clear" || actionId.startsWith("confirm-")) {
    // Clear all components
    const state = uiEngine.getState();
    actions.remove = Object.keys(state);
    actions.render = [
      {
        id: "empty-state",
        type: "EmptyState",
        visible: true,
        props: {
          title: "Screen Cleared",
          description: "All components have been removed.",
          actionLabel: "Start Over",
        },
        order: 0,
      },
    ];
  } else if (actionId === "confirm-data-deletion") {
    // Delete all user data but keep mock data
    dataStore.clear(); // This resets to mock data defaults

    // Also clear all components
    const state = uiEngine.getState();
    actions.remove = Object.keys(state);
    actions.render = [
      {
        id: "empty-state",
        type: "EmptyState",
        visible: true,
        props: {
          title: "All Data Deleted",
          description: "Your personal data has been removed. Mock data remains available for demonstration.",
          actionLabel: "Start Over",
        },
        order: 0,
      },
    ];
  }

  // Attach handlers
  actions.render = actions.render.map((comp) => attachHandlers(comp, handlerRegistry));

  // Execute actions
  for (const id of actions.remove) {
    uiEngine.dispatch({ type: "remove", id });
  }
  for (const comp of actions.render) {
    uiEngine.dispatch({ type: "render", component: comp });
  }

  return actions;
}

/**
 * Cancel destructive action
 */
export function cancelDestructiveAction(actionId: string): OrchestratorAction {
  uiEngine.dispatch({ type: "remove", id: actionId });
  return { render: [], remove: [actionId], update: [] };
}

// Re-export data store for convenience
export { dataStore, DataStore } from "./data-store";
export type { DataEntry, DataSource } from "./data-store";

// Re-export intent memory for debug panel
export { intentMemory, recordIntent, indexComponents, resolveRef } from "./intent-memory";
