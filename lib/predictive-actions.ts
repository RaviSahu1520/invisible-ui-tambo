/**
 * Predictive Action System
 *
 * Analyzes UI state and context to predict the most likely next user actions.
 * Only renders predictions when confidence is high to avoid overwhelming the user.
 */

/**
 * A predictive action suggestion
 */
export interface PredictiveAction {
  label: string;
  input: string; // The user input this action represents
  confidence: number; // 0-1
  reason?: string; // Why this was suggested (for debugging)
}

/**
 * UI context for prediction
 */
export interface PredictionContext {
  currentComponents: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
  }>;
  lastAction: string;
  hasSalaryData: boolean;
  hasExpenseData: boolean;
  hasChartData: boolean;
}

/**
 * Prediction rules
 * Each rule evaluates context and returns suggested actions with confidence
 */
type PredictionRule = (
  context: PredictionContext
) => PredictiveAction[] | null;

/**
 * Rule: After showing salary comparison, suggest export or detailed analysis
 */
const salaryComparisonRule: PredictionRule = (context) => {
  const hasSalaryCards = context.currentComponents.some(
    (c) => c.id === "salary-comparison-cards"
  );
  const hasChart = context.currentComponents.some((c) => c.id === "salary-comparison-chart");

  if (hasSalaryCards && hasChart) {
    return [
      {
        label: "Export Report",
        input: "Export my salary comparison as PDF",
        confidence: 0.7,
        reason: "User just viewed salary data, may want to save it",
      },
      {
        label: "View Expenses",
        input: "Show me my expense breakdown",
        confidence: 0.6,
        reason: "Natural progression from income to expenses",
      },
    ];
  }

  return null;
};

/**
 * Rule: After showing empty state, suggest common starting points
 */
const emptyStateRule: PredictionRule = (context) => {
  const hasEmptyState = context.currentComponents.some((c) => c.id === "empty-state");

  if (hasEmptyState) {
    return [
      {
        label: "Compare Salary",
        input: "Show me salary comparison",
        confidence: 0.8,
        reason: "Most common starting point",
      },
    ];
  }

  return null;
};

/**
 * Rule: After form submission, suggest viewing the results
 */
const afterFormRule: PredictionRule = (context) => {
  const justRemovedForm = context.lastAction.includes("salary-data-form");
  const justAddedCards = context.lastAction.includes("salary-comparison-cards");

  if (justRemovedForm && justAddedCards) {
    return [
      {
        label: "View Details",
        input: "Show more details about my finances",
        confidence: 0.6,
        reason: "User just entered data, may want deeper analysis",
      },
    ];
  }

  return null;
};

/**
 * Rule: After viewing expenses, suggest income or savings
 */
const expensesRule: PredictionRule = (context) => {
  const hasExpenses = context.currentComponents.some(
    (c) => c.type === "InsightSummary" || c.type === "SummaryCards"
  );
  const isExpenseContext = context.currentComponents.some((c) => {
    const cards = c.props.cards as Array<{ title?: string } | undefined> | undefined;
    return cards?.some?.((card) => card?.title?.toLowerCase().includes("expense"));
  });

  if (isExpenseContext) {
    return [
      {
        label: "View Income",
        input: "Show me my income breakdown",
        confidence: 0.7,
        reason: "Natural flow from expenses to income",
      },
      {
        label: "Calculate Savings Rate",
        input: "What is my savings rate?",
        confidence: 0.6,
        reason: "Common financial metric after viewing expenses",
      },
    ];
  }

  return null;
};

/**
 * Rule: After viewing chart, suggest different visualization
 */
const chartRule: PredictionRule = (context) => {
  const hasChart = context.currentComponents.some((c) => c.type === "ChartView");

  if (hasChart && context.currentComponents.length === 1) {
    return [
      {
        label: "Add Summary Cards",
        input: "Show me summary metrics",
        confidence: 0.6,
        reason: "Charts are often better with summary numbers",
      },
    ];
  }

  return null;
};

/**
 * All prediction rules in priority order
 */
const PREDICTION_RULES: PredictionRule[] = [
  emptyStateRule,
  salaryComparisonRule,
  afterFormRule,
  expensesRule,
  chartRule,
];

/**
 * Minimum confidence threshold for showing predictions
 */
const MIN_CONFIDENCE = 0.5;

/**
 * Maximum number of actions to suggest
 */
const MAX_SUGGESTIONS = 3;

/**
 * Get predictive actions based on current context
 */
export function getPredictiveActions(context: PredictionContext): PredictiveAction[] {
  const allSuggestions: PredictiveAction[] = [];

  // Run all prediction rules
  for (const rule of PREDICTION_RULES) {
    const suggestions = rule(context);
    if (suggestions) {
      allSuggestions.push(...suggestions);
    }
  }

  // Filter by confidence and limit results
  const filtered = allSuggestions
    .filter((s) => s.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SUGGESTIONS);

  return filtered;
}

/**
 * Build prediction context from current UI state
 */
export function buildPredictionContext(
  components: Array<{ id: string; type: string; props: Record<string, unknown> }>,
  lastActionNotes: string
): PredictionContext {
  return {
    currentComponents: components,
    lastAction: lastActionNotes,
    hasSalaryData: components.some((c) => c.id.includes("salary")),
    hasExpenseData: components.some((c) => c.id.includes("expense")),
    hasChartData: components.some((c) => c.type === "ChartView"),
  };
}

/**
 * Check if predictions should be shown
 */
export function shouldShowPredictions(predictions: PredictiveAction[]): boolean {
  return predictions.length > 0 && predictions.some((p) => p.confidence >= 0.6);
}

/**
 * Get dismissible state key for predictions
 */
export function getPredictionStateKey(actionSet: PredictiveAction[]): string {
  return `prediction-${actionSet.map((a) => a.label).sort().join("-")}`;
}
