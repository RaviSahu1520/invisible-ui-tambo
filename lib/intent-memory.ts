/**
 * Intent Memory System
 *
 * Lightweight in-memory storage for user intents and component references.
 * Enables natural language references like "this", "that", "the above chart".
 */

/**
 * A stored user intent
 */
export interface Intent {
  /** Unique identifier */
  id: string;
  /** Timestamp of when the intent was recorded */
  timestamp: number;
  /** The raw user input/text */
  input: string;
  /** Parsed intent type */
  type: string;
  /** Component IDs affected by this intent */
  componentIds: string[];
  /** Optional structured data from the intent */
  data?: Record<string, unknown>;
}

/**
 * A reference that can be resolved to a component
 */
export interface ComponentReference {
  /** Reference key (e.g., "this", "that", "chart", "welcome") */
  key: string;
  /** Component ID this reference points to */
  componentId: string;
  /** When this reference was created */
  timestamp: number;
  /** Optional description of what was referenced */
  description?: string;
}

/**
 * Intent memory storage
 */
export interface IntentMemory {
  /** All recorded intents */
  intents: Intent[];
  /** Component references by key */
  references: Map<string, ComponentReference>;
  /** Current intent pointer for "this" reference */
  currentIntentId: string | null;
}

/**
 * Options for creating an IntentMemory instance
 */
export interface IntentMemoryOptions {
  /** Maximum intents to keep in memory (default: 50) */
  maxIntents?: number;
  /** Maximum age of intents in milliseconds (default: 1 hour) */
  maxAge?: number;
}

/**
 * Intent Memory Engine
 *
 * Stores user intents and resolves references to components.
 * Maintains references like "this", "that", and component-specific aliases.
 */
export class IntentMemoryEngine {
  private intents: Intent[] = [];
  private references: Map<string, ComponentReference> = new Map();
  private currentIntentId: string | null = null;
  private maxIntents: number;
  private maxAge: number;

  constructor(options: IntentMemoryOptions = {}) {
    this.maxIntents = options.maxIntents ?? 50;
    this.maxAge = options.maxAge ?? 60 * 60 * 1000; // 1 hour
  }

  /**
   * Store a new intent
   */
  recordIntent(intent: Omit<Intent, "id" | "timestamp">): Intent {
    const now = Date.now();
    const newIntent: Intent = {
      id: `intent_${now}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      ...intent,
    };

    // Clean old intents first
    this.cleanup();

    // Add to memory
    this.intents.push(newIntent);
    this.currentIntentId = newIntent.id;

    // Create "this" reference pointing to the first affected component
    if (intent.componentIds.length > 0) {
      this.setReference("this", intent.componentIds[0], now);
    }

    // Shift "this" to "that" (previous becomes "that")
    const prevIntent = this.intents[this.intents.length - 2];
    if (prevIntent && prevIntent.componentIds.length > 0) {
      this.setReference("that", prevIntent.componentIds[0], prevIntent.timestamp);
    }

    return newIntent;
  }

  /**
   * Get the current intent
   */
  getCurrentIntent(): Intent | null {
    if (!this.currentIntentId) return null;
    return this.intents.find((i) => i.id === this.currentIntentId) ?? null;
  }

  /**
   * Get all intents
   */
  getIntents(): Intent[] {
    return [...this.intents];
  }

  /**
   * Get recent intents within a time window
   */
  getRecentIntents(count: number = 10): Intent[] {
    return this.intents.slice(-count);
  }

  /**
   * Get intents for a specific component
   */
  getIntentsForComponent(componentId: string): Intent[] {
    return this.intents.filter((i) => i.componentIds.includes(componentId));
  }

  /**
   * Set a reference key to point to a component
   */
  setReference(
    key: string,
    componentId: string,
    timestamp?: number,
    description?: string
  ): void {
    this.references.set(key.toLowerCase(), {
      key: key.toLowerCase(),
      componentId,
      timestamp: timestamp ?? Date.now(),
      description,
    });
  }

  /**
   * Resolve a reference key to a component ID
   */
  resolveReference(key: string): string | null {
    const lowerKey = key.toLowerCase();
    const ref = this.references.get(lowerKey);

    if (!ref) {
      // Try to find by component type/name match
      const matchingIntent = this.intents.find((intent) =>
        intent.componentIds.some((id) => id.toLowerCase().includes(lowerKey))
      );
      return matchingIntent?.componentIds[0] ?? null;
    }

    return ref.componentId;
  }

  /**
   * Get all current references
   */
  getReferences(): Map<string, ComponentReference> {
    return new Map(this.references);
  }

  /**
   * Parse text to extract references
   * Finds phrases like "this", "that", "the chart", "above", etc.
   */
  extractReferences(text: string): string[] {
    const references: string[] = [];
    const lowerText = text.toLowerCase();

    // Common reference patterns
    const patterns = [
      /\bthis\b/g,
      /\bthat\b/g,
      /\bthe (above )?(\w+)\b/g, // "the chart", "the above card"
      /\b(\w+) (above|below)\b/g, // "chart above", "table below"
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    }

    return [...new Set(references)];
  }

  /**
   * Resolve references in a text input to actual component IDs
   */
  resolveReferencesInText(text: string, componentMap: Record<string, string>): string[] {
    const extracted = this.extractReferences(text);
    const resolved: string[] = [];

    for (const ref of extracted) {
      // Clean the reference
      const cleanRef = ref
        .toLowerCase()
        .replace(/^(the |above |below )/i, "")
        .trim();

      // Direct reference lookup
      const componentId = this.resolveReference(cleanRef);
      if (componentId) {
        resolved.push(componentId);
        continue;
      }

      // Try component map (type -> id)
      if (componentMap[cleanRef]) {
        resolved.push(componentMap[cleanRef]);
      }
    }

    return [...new Set(resolved)];
  }

  /**
   * Associate a component with a descriptive name for future reference
   */
  nameComponent(componentId: string, name: string): void {
    this.setReference(name, componentId, Date.now(), `Component: ${name}`);
  }

  /**
   * Get context for AI - returns relevant recent intents and references
   */
  getContext(componentId?: string): {
    recentIntents: Intent[];
    activeReferences: Record<string, string>;
    contextSummary: string;
  } {
    const relevantIntents = componentId
      ? this.getIntentsForComponent(componentId).slice(-5)
      : this.getRecentIntents(5);

    const activeRefs: Record<string, string> = {};
    for (const [key, ref] of this.references) {
      activeRefs[key] = ref.componentId;
    }

    const contextSummary = this.buildContextSummary(relevantIntents, activeRefs);

    return {
      recentIntents: relevantIntents,
      activeReferences: activeRefs,
      contextSummary,
    };
  }

  /**
   * Build a natural language summary of context
   */
  private buildContextSummary(
    intents: Intent[],
    refs: Record<string, string>
  ): string {
    const parts: string[] = [];

    if (intents.length > 0) {
      parts.push(`Recent actions: ${intents.map((i) => i.type).join(", ")}`);
    }

    const refKeys = Object.keys(refs);
    if (refKeys.length > 0) {
      parts.push(`Available references: ${refKeys.join(", ")}`);
    }

    return parts.join(". ");
  }

  /**
   * Clean up old intents and expired references
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove old intents
    this.intents = this.intents.filter((intent) => {
      return now - intent.timestamp < this.maxAge;
    });

    // Trim to max size
    if (this.intents.length > this.maxIntents) {
      this.intents = this.intents.slice(-this.maxIntents);
    }

    // Remove stale references
    for (const [key, ref] of this.references) {
      if (now - ref.timestamp > this.maxAge) {
        this.references.delete(key);
      }
    }
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.intents = [];
    this.references.clear();
    this.currentIntentId = null;
  }

  /**
   * Export memory for persistence (optional)
   */
  export(): IntentMemory {
    return {
      intents: [...this.intents],
      references: new Map(this.references),
      currentIntentId: this.currentIntentId,
    };
  }

  /**
   * Import memory from storage (optional)
   */
  import(memory: IntentMemory): void {
    this.intents = memory.intents;
    this.references = new Map(memory.references);
    this.currentIntentId = memory.currentIntentId;
    this.cleanup();
  }
}

/**
 * Singleton instance for quick access
 */
export const intentMemory = new IntentMemoryEngine();

/**
 * Helper function to record an intent with component references
 */
export function recordIntent(
  input: string,
  type: string,
  componentIds: string[],
  data?: Record<string, unknown>
): Intent {
  return intentMemory.recordIntent({ input, type, componentIds, data });
}

/**
 * Helper function to resolve a reference to component ID
 */
export function resolveRef(key: string): string | null {
  return intentMemory.resolveReference(key);
}

/**
 * Helper function to create component references from UI state
 */
export function indexComponents(
  components: Array<{ id: string; type: string; order?: number }>
): void {
  // Index by type for easy reference
  const typeGroups = new Map<string, string[]>();

  for (const comp of components) {
    if (!typeGroups.has(comp.type)) {
      typeGroups.set(comp.type, []);
    }
    typeGroups.get(comp.type)!.push(comp.id);

    // Create a reference using the component type
    const refKey = comp.type.toLowerCase();
    if (!intentMemory.resolveReference(refKey)) {
      intentMemory.setReference(refKey, comp.id);
    }
  }

  // Create position-based references
  const sortedComps = [...components].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (let i = 0; i < sortedComps.length; i++) {
    if (i === 0) {
      intentMemory.setReference("first", sortedComps[i].id);
    }
    if (i === sortedComps.length - 1) {
      intentMemory.setReference("last", sortedComps[i].id);
    }
  }
}
