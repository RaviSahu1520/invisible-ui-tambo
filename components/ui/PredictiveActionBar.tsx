export interface PredictiveAction {
  label: string;
  input: string; // Intent string to dispatch
  confidence?: number;
  onClick?: () => void; // Deprecated: use onActionClick instead
}

export interface PredictiveActionBarProps {
  show?: boolean;
  actions: PredictiveAction[];
  onDismiss?: () => void;
  /** Called when an action is clicked with the intent string */
  onActionClick?: (intent: string) => void;
  /** Label of the action currently being processed */
  processingAction?: string;
}

export function PredictiveActionBar({
  show = true,
  actions,
  onDismiss,
  onActionClick,
  processingAction,
}: PredictiveActionBarProps) {
  if (!show || actions.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          Suggested:
        </span>
        {actions.map((action, index) => {
          const isProcessing = processingAction === action.label;
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                // Prefer onActionClick with intent string, fall back to onClick
                if (onActionClick && action.input) {
                  onActionClick(action.input, action.label);
                } else if (action.onClick) {
                  action.onClick();
                }
              }}
              disabled={isProcessing}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                "border-blue-200 bg-blue-50 text-blue-700",
                "hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm",
                "dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900 dark:hover:border-blue-700",
                isProcessing
                  ? "cursor-wait opacity-50"
                  : ""
              )}
            >
              {isProcessing && (
                <span className="h-3 w-3 animate-spin rounded-full border border-blue-300 border-t-blue-600 dark:border-blue-700 dark:border-t-blue-400" />
              )}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
          aria-label="Dismiss suggestions"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Helper function for className merging (simple version of cn utility)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
