/**
 * UI State Engine
 *
 * A framework-agnostic state engine for dynamically controlling
 * component visibility and props. Supports incremental updates
 * without full UI resets.
 *
 * Integrates with Intent Memory for tracking user intents and
 * resolving natural language references like "this", "that", "the chart".
 */

import type { IntentMemoryEngine } from "./intent-memory";

/**
 * Represents a single UI component instance
 */
export interface UIComponent {
  /** Unique identifier for this component instance */
  id: string;
  /** Component type name (e.g., "EmptyState", "ChartView") */
  type: string;
  /** Props to pass to the component */
  props: Record<string, unknown>;
  /** Whether the component is currently visible */
  visible: boolean;
  /** Optional order index for rendering sequence */
  order?: number;
}

/**
 * The state of all UI components
 */
export type UIState = Record<string, UIComponent>;

/**
 * Actions that can be performed on the UI state
 */
export type UIAction =
  | { type: "render"; component: UIComponent }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; props: Record<string, unknown> }
  | { type: "show"; id: string }
  | { type: "hide"; id: string }
  | { type: "setOrder"; id: string; order: number }
  | { type: "batch"; actions: UIAction[] };

/**
 * Result of a state transition
 */
export interface UIStateResult {
  /** The new UI state */
  state: UIState;
  /** Components that were added in this transition */
  added: string[];
  /** Components that were removed in this transition */
  removed: string[];
  /** Components that were updated in this transition */
  updated: string[];
  /** Components whose visibility changed */
  visibilityChanged: string[];
}

/**
 * UI State Engine class
 *
 * Manages component state with incremental updates.
 * Framework-agnostic - can be used with React, Vue, Svelte, etc.
 */
export class UIStateEngine {
  private state: UIState = {};
  private listeners: Set<(result: UIStateResult) => void> = new Set();
  private intentMemory?: IntentMemoryEngine;
  private nextOrder: number = 0;
  private version: number = 0;

  /**
   * Get the current version - increments on every state change
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get the current UI state
   */
  getState(): UIState {
    return { ...this.state };
  }

  /**
   * Get a specific component by ID
   */
  getComponent(id: string): UIComponent | undefined {
    return this.state[id] ? { ...this.state[id] } : undefined;
  }

  /**
   * Get all visible components, sorted by order
   */
  getVisibleComponents(): UIComponent[] {
    return Object.values(this.state)
      .filter((c) => c.visible)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => ({ ...c }));
  }

  /**
   * Check if a component exists
   */
  has(id: string): boolean {
    return id in this.state;
  }

  /**
   * Check if a component is visible
   */
  isVisible(id: string): boolean {
    return this.state[id]?.visible ?? false;
  }

  /**
   * Dispatch an action to update the state
   */
  dispatch(action: UIAction): UIStateResult {
    const result = this.reduce(this.state, action);
    this.state = result.state;
    this.version++;
    this.notify(result);
    return result;
  }

  /**
   * Dispatch multiple actions in a single transaction
   */
  dispatchAll(actions: UIAction[]): UIStateResult {
    return this.dispatch({ type: "batch", actions });
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(listener: (result: UIStateResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset the entire state
   */
  reset(): UIStateResult {
    const removed = Object.keys(this.state);
    this.state = {};
    this.version++;
    const result: UIStateResult = {
      state: {},
      added: [],
      removed,
      updated: [],
      visibilityChanged: [],
    };
    this.notify(result);
    return result;
  }

  /**
   * Attach an intent memory engine for automatic intent tracking
   */
  setIntentMemory(memory: IntentMemoryEngine): void {
    this.intentMemory = memory;
  }

  /**
   * Record an intent with the attached memory engine
   */
  recordIntent(
    input: string,
    type: string,
    componentIds: string[],
    data?: Record<string, unknown>
  ): void {
    if (this.intentMemory) {
      this.intentMemory.recordIntent({ input, type, componentIds, data });
    }
  }

  /**
   * Resolve a reference key to a component ID
   */
  resolveReference(key: string): string | null {
    if (!this.intentMemory) return null;
    return this.intentMemory.resolveReference(key);
  }

  /**
   * Get context from intent memory for AI consumption
   */
  getIntentContext(componentId?: string): ReturnType<
    IntentMemoryEngine["getContext"]
  > {
    if (!this.intentMemory) {
      return {
        recentIntents: [],
        activeReferences: {},
        contextSummary: "",
      };
    }
    return this.intentMemory.getContext(componentId);
  }

  /**
   * Auto-index all current components for reference resolution
   */
  indexComponents(): void {
    if (!this.intentMemory) return;

    const components = Object.values(this.state);

    // Index by type
    for (const comp of components) {
      const refKey = comp.type.toLowerCase();
      if (!this.intentMemory.resolveReference(refKey)) {
        this.intentMemory.setReference(refKey, comp.id);
      }
    }

    // Create position-based references
    const sortedComps = components
      .filter((c) => c.visible)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (let i = 0; i < sortedComps.length; i++) {
      if (i === 0) {
        this.intentMemory.setReference("first", sortedComps[i].id);
      }
      if (i === sortedComps.length - 1) {
        this.intentMemory.setReference("last", sortedComps[i].id);
      }
    }
  }

  /**
   * Pure reducer function for state transitions
   */
  private reduce(state: UIState, action: UIAction): UIStateResult {
    const result: UIStateResult = {
      state: { ...state },
      added: [],
      removed: [],
      updated: [],
      visibilityChanged: [],
    };

    if (action.type === "batch") {
      // Process batch actions sequentially
      let currentState = state;
      for (const subAction of action.actions) {
        const subResult = this.reduce(currentState, subAction);
        currentState = subResult.state;
        result.added.push(...subResult.added);
        result.removed.push(...subResult.removed);
        result.updated.push(...subResult.updated);
        result.visibilityChanged.push(...subResult.visibilityChanged);
      }
      result.state = currentState;
      return result;
    }

    switch (action.type) {
      case "render": {
        const existing = state[action.component.id];
        if (existing) {
          // Update existing component
          result.state[action.component.id] = {
            ...existing,
            ...action.component,
            id: existing.id, // Preserve ID
          };
          result.updated.push(action.component.id);
        } else {
          // Add new component with auto-generated order if not provided
          const newComponent = {
            ...action.component,
            visible: action.component.visible ?? true,
            order: action.component.order ?? this.nextOrder++,
          };
          result.state[action.component.id] = newComponent;
          result.added.push(action.component.id);
        }
        break;
      }

      case "remove": {
        if (state[action.id]) {
          delete result.state[action.id];
          result.removed.push(action.id);
        }
        break;
      }

      case "update": {
        if (state[action.id]) {
          const existing = result.state[action.id];
          result.state[action.id] = {
            ...existing,
            props: { ...existing.props, ...action.props },
          };
          result.updated.push(action.id);
        }
        break;
      }

      case "show": {
        if (state[action.id] && !state[action.id].visible) {
          result.state[action.id] = { ...state[action.id], visible: true };
          result.visibilityChanged.push(action.id);
        }
        break;
      }

      case "hide": {
        if (state[action.id] && state[action.id].visible) {
          result.state[action.id] = { ...state[action.id], visible: false };
          result.visibilityChanged.push(action.id);
        }
        break;
      }

      case "setOrder": {
        if (state[action.id]) {
          result.state[action.id] = { ...state[action.id], order: action.order };
          result.updated.push(action.id);
        }
        break;
      }
    }

    return result;
  }

  /**
   * Notify all listeners of a state change
   */
  private notify(result: UIStateResult): void {
    this.listeners.forEach((listener) => {
      try {
        listener(result);
      } catch (error) {
        console.error("Error in UIStateEngine listener:", error);
      }
    });
  }
}

/**
 * Helper function to create a UI component definition
 */
export function defineComponent(
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  visible: boolean = true,
  order?: number
): UIComponent {
  return { id, type, props, visible, order };
}

/**
 * Helper action creators
 */
export const actions = {
  render: (component: UIComponent): UIAction => ({ type: "render", component }),
  remove: (id: string): UIAction => ({ type: "remove", id }),
  update: (id: string, props: Record<string, unknown>): UIAction => ({
    type: "update",
    id,
    props,
  }),
  show: (id: string): UIAction => ({ type: "show", id }),
  hide: (id: string): UIAction => ({ type: "hide", id }),
  setOrder: (id: string, order: number): UIAction => ({ type: "setOrder", id, order }),
  batch: (actions: UIAction[]): UIAction => ({ type: "batch", actions }),
};

/**
 * Singleton instance for quick access
 */
export const uiEngine = new UIStateEngine();
