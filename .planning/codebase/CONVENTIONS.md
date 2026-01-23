# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `Canvas.jsx`, `PhotoshopEditor.jsx`)
- TypeScript files: camelCase with `.ts` extension (e.g., `HistoryManager.ts`, `useCanvasFilters.ts`)
- Utilities and utilities functions: camelCase with `.js` extension (e.g., `ftsFormat.js`)
- Test files: Suffixed with `.test.ts`, `.test.tsx`, or `.spec.ts` (e.g., `Canvas.test.tsx`, `HistoryManager.test.ts`)

**Functions:**
- camelCase for all function names
- Prefix hooks with `use` (e.g., `useCanvasFilters`)
- Handler functions prefixed with `handle` (e.g., `handleSaveProject`, `handleFileUpload`)
- Callback functions follow standard camelCase (e.g., `onHistoryAdd`, `onLayersUpdate`)

**Variables:**
- camelCase for all variable names
- Boolean variables prefixed with `is` or `has` (e.g., `isDrawingMode`, `hasUnsavedChanges`)
- Ref variables suffixed with `Ref` (e.g., `canvasRef`, `projectFileInputRef`)
- State setter variables follow React pattern: `[state, setState]`
- Constants use UPPER_SNAKE_CASE (e.g., `AUTO_SAVE_INTERVAL`, `FTS_VERSION`, `FTS_FORMAT`)

**Types:**
- TypeScript interface names: PascalCase prefixed with `I` or just PascalCase without prefix
- Type aliases: PascalCase (e.g., `HistoryEntry`, `RegionDiff`)
- Generic type parameters: Single uppercase letter or PascalCase (e.g., `T`, `K`, `CanvasElement`)

## Code Style

**Formatting:**
- No explicit formatter configured in package.json (no Prettier)
- Linting: ESLint is installed (`eslint@^9.23.0`)
- Indentation: 2 spaces (inferred from code)
- Semicolons: Used consistently throughout (required by convention)
- Line length: No strict limit enforced

**Linting:**
- Tool: ESLint with plugins for React hooks and React refresh
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Rules: Default configuration, no `.eslintrc` file found - uses ESLint 9 flat config
- No strict rules enforced for unused variables (`noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig.json)

**TypeScript:**
- Target: ES2020
- Module: ESNext
- Strict mode: Enabled (`"strict": true`)
- Path aliases: `@/*` resolves to `src/*`
- JSX: React 17+ new JSX transform (`jsx: "react-jsx"`)
- Module resolution: bundler mode

## Import Organization

**Order:**
1. External library imports (React, third-party packages)
2. Relative imports from project (components, utils, hooks)
3. Type imports (at top or inline where used)

**Examples from codebase:**
```typescript
// External libraries first
import React, { useState, useRef, useEffect } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

// Project imports
import Canvas from './Canvas';
import { toast } from '../hooks/use-toast';
import { serializeProject } from '../utils/ftsFormat';

// Type imports (can be mixed with regular imports)
import type { HistoryEntry, RegionDiff, Rect } from './types';
```

**Path Aliases:**
- `@/` resolves to `src/` (configured in tsconfig.json and vitest.config.ts)
- Used throughout: `@/engine`, `@/components`, `@/utils`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations and file I/O
- Error objects with descriptive messages
- Toast notifications for user-facing errors (using `toast()` utility)
- Early returns for validation failures
- Null/undefined checks before operations

**Examples:**
```typescript
// File: PhotoshopEditor.jsx
try {
  const result = await saveProject(ftsContent, projectName);
  if (result.success) {
    // Handle success
  }
} catch (error) {
  toast({
    title: "Error Saving Project",
    description: error.message,
    variant: "destructive"
  });
}
```

## Logging

**Framework:** console methods (console.log, console.error)

**Patterns:**
- Used sparingly in production code
- Prefixed with bracketed context (e.g., `[AutoSave]`, `[Debug]`)
- Only in utility/utility functions or critical operations
- Example from code: `console.log('[AutoSave] Saving project...');`

## Comments

**When to Comment:**
- File-level comments: At top of files describing module purpose
- Function-level comments: JSDoc-style for public/exported functions
- Complex logic: Comment before complex algorithms or non-obvious patterns
- Implementation notes: Explain "why" not "what"

**JSDoc/TSDoc:**
- Used for class methods and public exports
- Format includes description, parameters, returns, and potential errors
- Example from code:
```typescript
/**
 * Save a full snapshot of all layers
 * Simpler API for compatibility - internally creates diffs
 */
saveSnapshot(description: string): void
```

## Function Design

**Size:** Functions typically 20-50 lines
- Longer functions (50-200 lines) used for component render logic
- Utility functions kept concise (10-20 lines)

**Parameters:**
- Destructuring used for objects when 2+ properties
- React component props often use destructuring in function signature
- Maximum 3-4 parameters before switching to object param

**Return Values:**
- Explicit return types in TypeScript files
- Single return path preferred, early returns acceptable for guards
- Null/undefined used for optional returns
- No implicit returns in class methods

## Module Design

**Exports:**
- Named exports for utilities and helper functions
- Default exports for React components
- Type exports marked with `export type`
- Barrel files (index files) used to group related exports

**Barrel Files:**
- Used in `src/engine/react/index.ts` to export hooks/context
- Used in `src/engine/index.ts` to export main classes
- Pattern: `export * from './specific-file'` or `export { default as Component } from './file'`

## Async/Await

**Pattern:**
- Async functions preferred over `.then()` chains
- Error handling with try-catch blocks
- `await` used for promises, including component methods
- Event handlers use `async (e) => { await operation() }`

## React Patterns

**Component Structure:**
- Functional components with hooks
- State management with `useState`
- Refs for imperative operations with `useRef`
- Effects with `useEffect` for side effects
- Memoization not heavily used (no React.memo patterns found)

**Event Handlers:**
- Inline arrow functions in JSX
- `onChange`, `onClick`, `onSubmit` pattern for events
- File input handling with ref-based triggers

## Class-Based Code

**Pattern:** Used for business logic classes (e.g., `HistoryManager`, `BinaryStateManager`)
- Constructor for initialization with dependency injection
- Private fields marked with `private` keyword
- Public methods for API surface
- JSDoc comments for method documentation

---

*Convention analysis: 2026-01-22*
