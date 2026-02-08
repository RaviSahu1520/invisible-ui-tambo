# Generative UI: Intent-Driven Interface Orchestration

## Problem Statement

Traditional UIs are static. Users navigate predetermined interfaces to accomplish tasks. Even "smart" applications are hard-coded to respond in fixed ways.

**What if UI could generate itself based on intent?**

## Solution: Invisible / Intent-Driven UI

This project demonstrates **Generative UI**—an interface that:

1. **Starts Empty** - No navigation, header, or controls until user expresses intent
2. **Evolves Incrementally** - Components appear, change, or disappear based on user needs
3. **Orchestrated by AI** - An AI decision layer determines what UI to render
4. **Remembers Context** - References like "this", "that", "the chart above" work naturally

## What is Generative UI?

Generative UI is a paradigm where the AI acts as a **UI Orchestrator**, not a chatbot. The AI:

- Receives user input + current UI state
- Returns JSON decisions: `{ render, remove, update }`
- The UI engine executes these decisions to mutate the interface

The user never sees a chat conversation—they see an interface that responds to their intent.

## Why Tambo is Essential

Tambo SDK provides the decision layer for Generative UI:

- **Component Registry**: Register React components for AI rendering
- **Intent Understanding**: AI analyzes user needs against available UI
- **Structured Decisions**: Returns JSON-only UI actions, not text responses
- **Context Awareness**: Maintains conversation context for reference resolution

## Architecture

```
User Input
    ↓
Intent Resolution (resolve "this", "that")
    ↓
AI Orchestrator (Tambo/Simulated)
    ↓
UI State Engine (dispatch render/remove/update)
    ↓
React Re-render (UIRenderer)
```

**Key Components:**
- `OrchestratorClient` - Main UI container
- `ui-orchestrator.ts` - Intent processing and AI decisions
- `ui-state-engine.ts` - Framework-agnostic state management
- `intent-memory.ts` - Reference tracking for natural language
- `data-store.ts` - Hybrid mock/user data layer

## Demo

1. Start the app: `npm run dev`
2. The screen appears empty (just a minimal input prompt)
3. Type: "Show me the salary comparison between last month and current month"
4. Watch: InputForm appears to collect missing data, then ChartView and SummaryCards render
5. Try: "Clear" → GuardrailModal confirms
6. Try: "Export this" → (reference resolution triggers export actions)

## Tech Stack

- **Next.js 16** - App Router for SSR
- **React 19** - UI rendering
- **Tambo SDK** - AI decision layer
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Status

This is a hackathon demonstration of Generative UI principles.
Production deployment would replace the simulated AI with actual Tambo API calls.
