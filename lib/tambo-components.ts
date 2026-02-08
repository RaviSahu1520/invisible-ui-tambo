/**
 * Tambo UI Components Registry
 *
 * DEMONSTRATION: Registry is intentionally empty for this hackathon demo.
 *
 * The project uses a simulated AI orchestrator for demonstration purposes.
 * This demonstrates the Generative UI architecture pattern:
 * - Intent-driven UI orchestration
 * - Incremental component mutations
 * - Context-aware reference resolution
 *
 * For production deployment, register components here following the TamboComponent interface.
 *
 * PRODUCTION INTEGRATION:
 * 1. Import your React components
 * 2. Define prop schemas using zod for AI understanding
 * 3. Add to the tamboComponents array
 * 4. Replace simulateAIResponse() in ui-orchestrator.ts with actual Tambo calls
 */

import type { TamboComponent } from "@tambo-ai/react";

/**
 * Array of Tambo components registered for AI rendering.
 *
 * DEMO MODE: Empty - using simulated orchestrator
 * PRODUCTION: Add components here for real AI-driven rendering
 */
export const tamboComponents: TamboComponent[] = [];

/**
 * Example production component registration:
 *
 * import { MyComponent } from "@/components/my-component";
 * import { z } from "zod";
 *
 * export const tamboComponents: TamboComponent[] = [
 *   {
 *     name: "MyComponent",
 *     description: "A sample component that displays a greeting",
 *     component: MyComponent,
 *     propsSchema: z.object({
 *       name: z.string().describe("The name to greet"),
 *       count: z.number().optional().describe("Number of times to repeat"),
 *     }),
 *   },
 * ];
 */
