/**
 * React integration for Intent Memory
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IntentMemoryEngine,
  Intent,
  ComponentReference,
  IntentMemoryOptions,
  recordIntent,
  resolveRef,
  indexComponents,
} from "./intent-memory";

/**
 * Hook to access the intent memory engine
 */
export function useIntentMemory(options?: IntentMemoryOptions) {
  const [engine] = useState(() => new IntentMemoryEngine(options));

  const recordIntent = useCallback(
    (input: string, type: string, componentIds: string[], data?: Record<string, unknown>) => {
      return engine.recordIntent({ input, type, componentIds, data });
    },
    [engine]
  );

  const getCurrentIntent = useCallback(() => engine.getCurrentIntent(), [engine]);

  const getIntents = useCallback(() => engine.getIntents(), [engine]);

  const getRecentIntents = useCallback(
    (count?: number) => engine.getRecentIntents(count),
    [engine]
  );

  const getIntentsForComponent = useCallback(
    (componentId: string) => engine.getIntentsForComponent(componentId),
    [engine]
  );

  const setReference = useCallback(
    (key: string, componentId: string, timestamp?: number, description?: string) => {
      engine.setReference(key, componentId, timestamp, description);
    },
    [engine]
  );

  const resolveReference = useCallback(
    (key: string) => engine.resolveReference(key),
    [engine]
  );

  const extractReferences = useCallback(
    (text: string) => engine.extractReferences(text),
    [engine]
  );

  const resolveReferencesInText = useCallback(
    (text: string, componentMap: Record<string, string>) => {
      return engine.resolveReferencesInText(text, componentMap);
    },
    [engine]
  );

  const nameComponent = useCallback(
    (componentId: string, name: string) => {
      engine.nameComponent(componentId, name);
    },
    [engine]
  );

  const getContext = useCallback(
    (componentId?: string) => engine.getContext(componentId),
    [engine]
  );

  const clear = useCallback(() => engine.clear(), [engine]);

  return {
    engine,
    recordIntent,
    getCurrentIntent,
    getIntents,
    getRecentIntents,
    getIntentsForComponent,
    setReference,
    resolveReference,
    extractReferences,
    resolveReferencesInText,
    nameComponent,
    getContext,
    clear,
  };
}

/**
 * Hook that integrates UI state with intent memory
 * Automatically tracks components and their intents
 */
export function useUIWithIntentMemory() {
  const { recordIntent, resolveReference, extractReferences, getContext } =
    useIntentMemory();

  /**
   * Process a user input and record it as an intent
   */
  const processInput = useCallback(
    (
      input: string,
      affectedComponentIds: string[],
      intentType: string = "user_action"
    ) => {
      // Extract any references in the input
      const refs = extractReferences(input);

      // Record the intent
      const intent = recordIntent(input, intentType, affectedComponentIds, {
        references: refs,
      });

      return { intent, references: refs };
    },
    [recordIntent, extractReferences]
  );

  /**
   * Resolve a natural language reference to component ID(s)
   */
  const resolve = useCallback(
    (reference: string): string | null => {
      return resolveReference(reference);
    },
    [resolveReference]
  );

  /**
   * Get context summary for AI consumption
   */
  const getAIContext = useCallback(
    (componentId?: string) => {
      return getContext(componentId);
    },
    [getContext]
  );

  return {
    processInput,
    resolve,
    getAIContext,
  };
}

/**
 * Hook to auto-index components for intent reference
 */
export function useComponentIndexer(components: Array<{ id: string; type: string }>) {
  useEffect(() => {
    indexComponents(components);
  }, [components]);
}

// Re-export types and helpers
export type { Intent, ComponentReference, IntentMemory, IntentMemoryOptions } from "./intent-memory";
export { IntentMemoryEngine, recordIntent, resolveRef, indexComponents };
