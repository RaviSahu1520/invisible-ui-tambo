/**
 * Dynamic UI Renderer
 *
 * Renders components based on UI state engine.
 * Maps component types to actual React components.
 */

"use client";

import type { UIComponent } from "@/lib/ui-state-engine";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartView } from "@/components/ui/ChartView";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { InputForm } from "@/components/ui/InputForm";
import { ExportActions } from "@/components/ui/ExportActions";
import { InsightSummary } from "@/components/ui/InsightSummary";
import { PredictiveActionBar } from "@/components/ui/PredictiveActionBar";
import { GuardrailModal } from "@/components/ui/GuardrailModal";

/**
 * Component registry mapping type names to React components
 */
const COMPONENT_REGISTRY: Record<
  string,
  React.ComponentType<any>
> = {
  EmptyState,
  ChartView,
  SummaryCards,
  DateRangePicker,
  InputForm,
  ExportActions,
  InsightSummary,
  PredictiveActionBar,
  GuardrailModal,
};

/**
 * Props for the UIRenderer
 */
export interface UIRendererProps {
  /** Components to render from the UI state engine */
  components?: UIComponent[];
  /** Custom component registry for extensibility */
  registry?: Record<string, React.ComponentType<any>>;
  /** Label of the action currently being processed (for PredictiveActionBar) */
  processingAction?: string;
}

/**
 * Dynamic UI Renderer component
 *
 * Renders components based on UI state. Components are rendered
 * in order, and only if they are visible.
 */
export function UIRenderer({
  components = [],
  registry = COMPONENT_REGISTRY,
  processingAction,
}: UIRendererProps) {
  const mergedRegistry = { ...COMPONENT_REGISTRY, ...registry };

  return (
    <>
      {components.map((component) => {
        const ComponentClass = mergedRegistry[component.type];

        if (!ComponentClass) {
          console.warn(`Unknown component type: ${component.type}`);
          return null;
        }

        // Create a composite show prop that combines the component's visible state
        // with any show prop already in the component props
        const show = component.visible !== false && component.props.show !== false;

        // For PredictiveActionBar, pass the processingAction prop
        const props = component.type === "PredictiveActionBar"
          ? { ...component.props, processingAction }
          : component.props;

        return (
          <div
            key={component.id}
            className="animate-in fade-in duration-300"
          >
            <ComponentClass
              {...props}
              show={show}
            />
          </div>
        );
      })}
    </>
  );
}

/**
 * Hook to use the UIRenderer with the UI state engine
 */
export function useUIRenderer() {
  return { UIRenderer, COMPONENT_REGISTRY };
}
