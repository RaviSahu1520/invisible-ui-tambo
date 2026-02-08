/**
 * React integration for UI State Engine
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { UIComponent, UIStateResult } from "./ui-state-engine";
import { actions, defineComponent, type UIAction, uiEngine } from "./ui-state-engine";

// Cached server snapshots for stability
const EMPTY_STATE = {};
const EMPTY_COMPONENTS: UIComponent[] = [];

/**
 * Hook to subscribe to UI state changes
 * Returns the current state and a dispatcher
 */
export function useUIState() {
  const [, forceUpdate] = useState({});
  const stateRef = useRef(uiEngine.getState());

  useEffect(() => {
    const unsubscribe = uiEngine.subscribe(() => {
      stateRef.current = uiEngine.getState();
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const dispatch = useCallback((action: UIAction) => {
    return uiEngine.dispatch(action);
  }, []);

  return { state: stateRef.current, dispatch };
}

/**
 * Hook to get visible components, sorted by order
 */
export function useVisibleComponents() {
  const [, forceUpdate] = useState({});
  const componentsRef = useRef<UIComponent[]>(EMPTY_COMPONENTS);
  const versionRef = useRef<number>(-1);

  // Initial read (only on first mount when versionRef is -1)
  if (versionRef.current === -1) {
    versionRef.current = uiEngine.getVersion();
    componentsRef.current = uiEngine.getVisibleComponents();
  }

  useEffect(() => {
    const unsubscribe = uiEngine.subscribe(() => {
      versionRef.current = uiEngine.getVersion();
      componentsRef.current = uiEngine.getVisibleComponents();
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  return componentsRef.current;
}

/**
 * Hook to get a specific component
 */
export function useComponent(id: string) {
  const [, forceUpdate] = useState({});
  const componentRef = useRef<UIComponent | undefined>(undefined);
  const versionRef = useRef<number>(-1);

  // Initial read (only on first mount when versionRef is -1)
  if (versionRef.current === -1) {
    versionRef.current = uiEngine.getVersion();
    componentRef.current = uiEngine.getComponent(id);
  }

  useEffect(() => {
    const unsubscribe = uiEngine.subscribe(() => {
      versionRef.current = uiEngine.getVersion();
      componentRef.current = uiEngine.getComponent(id);
      forceUpdate({});
    });
    return unsubscribe;
  }, [id]);

  return componentRef.current;
}

/**
 * Hook to get UI control helpers
 * Returns convenient methods for common UI operations
 */
export function useUIControls() {
  const dispatch = useCallback((action: UIAction) => {
    return uiEngine.dispatch(action);
  }, []);

  const render = useCallback((component: UIComponent) => {
    return dispatch(actions.render(component));
  }, [dispatch]);

  const remove = useCallback((id: string) => {
    return dispatch(actions.remove(id));
  }, [dispatch]);

  const update = useCallback((id: string, props: Record<string, unknown>) => {
    return dispatch(actions.update(id, props));
  }, [dispatch]);

  const show = useCallback((id: string) => {
    return dispatch(actions.show(id));
  }, [dispatch]);

  const hide = useCallback((id: string) => {
    return dispatch(actions.hide(id));
  }, [dispatch]);

  const batch = useCallback((ops: UIAction[]) => {
    return dispatch(actions.batch(ops));
  }, [dispatch]);

  const clear = useCallback(() => {
    return uiEngine.reset();
  }, []);

  return {
    render,
    remove,
    update,
    show,
    hide,
    batch,
    clear,
    defineComponent,
    actions,
  };
}

/**
 * Hook that tracks the last state change result
 * Useful for animations and transitions
 */
export function useUIChange() {
  const [lastChange, setLastChange] = useState<UIStateResult | null>(null);

  useEffect(() => {
    const unsubscribe = uiEngine.subscribe((result) => {
      setLastChange(result);
    });
    return unsubscribe;
  }, []);

  return lastChange;
}

// Re-export types and helpers
export type { UIComponent, UIState, UIAction, UIStateResult } from "./ui-state-engine";
export { uiEngine, defineComponent, actions };
