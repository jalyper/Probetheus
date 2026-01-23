# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Incomplete Compositing Pipeline:**
- Issue: Full layer compositing is stubbed out with a TODO comment. Currently only renders the first visible layer.
- Files: `frontend/src/engine/react/ImageEngineContext.tsx` (line 217)
- Impact: Multi-layer compositions don't render correctly. Layer blending and opacity are not visually applied.
- Fix approach: Implement full compositing pipeline in `renderToCanvas()` that iterates through visible layers and applies blend modes, opacity, and proper z-ordering.

**Partial WASM Filter Implementation:**
- Issue: JavaScript fallback for Float32 filters (`processFloat32JS`) only implements brightness. Other filters are stubs.
- Files: `frontend/src/engine/filters/WasmFilterEngine.ts` (lines 240-249)
- Impact: If WASM fails to load, contrast, saturation, grayscale, sepia, and invert filters fall back to no-op for Float32 pixel data (used internally with BinaryStateManager).
- Fix approach: Complete the JavaScript implementations for all filter types matching the WASM behavior, or refactor to use Uint8 ImageData conversion.

**Unfinished WebGL Renderer Integration:**
- Issue: WebGL renderer is initialized but not fully integrated into the rendering pipeline. Comments indicate incomplete implementation.
- Files: `frontend/src/engine/react/ImageEngineContext.tsx` (lines 226-227)
- Impact: GPU acceleration benefits are not realized. Falls back to CPU rendering even when WebGL is available.
- Fix approach: Complete the `renderLayer` method call and implement proper texture binding and render target setup.

**No ESLint Configuration:**
- Issue: Project has `eslint` as a dev dependency but no `.eslintrc` or `eslint.config.js` file exists at project root.
- Files: `frontend/package.json` (line 15), `frontend/` (root directory)
- Impact: Code style inconsistencies are not caught. `lint` script will run with default rules or fail.
- Fix approach: Create `eslint.config.js` or `.eslintrc.json` with appropriate rules for React/TypeScript projects.

**TypeScript Linting Settings Not Enforced:**
- Issue: `tsconfig.json` disables unused variable/parameter detection (`noUnusedLocals: false`, `noUnusedParameters: false`).
- Files: `frontend/tsconfig.json` (lines 19-20)
- Impact: Dead code and unused imports accumulate undetected. Makes refactoring harder.
- Fix approach: Enable `noUnusedLocals` and `noUnusedParameters`, fix violations, or use ESLint rules instead.

## Known Bugs

**CORS Configuration Accepts All Origins in Development:**
- Symptoms: Security risk if production code uses same CORS config
- Files: `backend/server.py` (line 75)
- Trigger: Default CORS_ORIGINS environment variable is `*`
- Workaround: Always set CORS_ORIGINS env var to specific origins before deployment
- Fix: Change default from `*` to a safer value or require explicit env var without default.

**Missing Error Recovery in Async Filter Operations:**
- Symptoms: Filter application can fail silently if WASM module throws during processing
- Files: `frontend/src/engine/react/ImageEngineContext.tsx` (lines 164-192)
- Trigger: Malformed imageData or WASM memory issues during `processFloat32InPlace()`
- Workaround: None - errors are not propagated to caller
- Fix: Add try-catch around `filterEngine.processFloat32InPlace()` call and propagate errors to UI.

**History Manager Doesn't Account for Layer Deletion:**
- Symptoms: Undo/redo can reference deleted layers, causing silent failures
- Files: `frontend/src/engine/state/HistoryManager.ts` (lines 107-141)
- Trigger: User deletes a layer, then undoes a filter applied to that layer
- Workaround: Recreate the layer manually
- Fix: Add layer existence validation in `undo()`/`redo()` or store full layer state in history entries.

## Security Considerations

**Environment Variable Not Validated on Backend:**
- Risk: Missing MONGO_URL or DB_NAME will crash at runtime with unclear errors
- Files: `backend/server.py` (lines 18-20)
- Current mitigation: None - application assumes env vars exist
- Recommendations: Use pydantic settings model to validate and provide clear error messages for missing vars.

**No Input Validation on Filter Parameters:**
- Risk: Malformed filter parameters could cause WASM module crashes or integer overflows
- Files: `frontend/src/engine/filters/WasmFilterEngine.ts` (lines 90-124)
- Current mitigation: None - values passed directly to WASM
- Recommendations: Add range validation for brightness (-100 to 100), contrast, saturation values before passing to WASM.

**MongoDB Connection String in Environment Variable:**
- Risk: Credentials could be logged or leaked if logging is enabled
- Files: `backend/server.py` (line 18)
- Current mitigation: None
- Recommendations: Use IAM roles/connection string caching instead of hardcoded env var for production.

## Performance Bottlenecks

**Memory Allocation on Every Filter Application:**
- Problem: `composite()` allocates a full-size Float32Array (4x canvas dimensions) every call
- Files: `frontend/src/engine/state/BinaryStateManager.ts` (line 166)
- Cause: Creates new arrays instead of reusing a buffer
- Improvement path: Allocate reusable composite buffer in constructor or use object pool pattern.

**History Manager Stores Full Pixel Arrays:**
- Problem: Each undo/redo entry copies entire layer pixel data even if only small region changed
- Files: `frontend/src/engine/state/HistoryManager.ts` (lines 29-50)
- Cause: Implementation stores full layer snapshots on first change, defeating purpose of binary diffs
- Improvement path: Only store actual dirty regions from `layer.dirtyRegion`, not entire layer pixels.

**Large Test Files Without Modularization:**
- Problem: Canvas.test.tsx is 971 lines, creating large test bundles and slow test runs
- Files: `frontend/src/components/__tests__/Canvas.test.tsx`
- Cause: Single test file for complex component with many behaviors
- Improvement path: Split into Canvas.behavior.test.tsx, Canvas.rendering.test.tsx, etc.

**No Lazy Loading of WASM Module:**
- Problem: WASM module is imported eagerly in WasmFilterEngine, blocks initialization
- Files: `frontend/src/engine/filters/WasmFilterEngine.ts` (line 53)
- Cause: Dynamic import is awaited immediately without timeout or parallel loading
- Improvement path: Implement parallel loading with timeout, show UI before WASM is ready.

## Fragile Areas

**Binary State Manager Image Conversion:**
- Files: `frontend/src/engine/state/BinaryStateManager.ts` (lines 148-160, 254-262)
- Why fragile: Relies on implicit assumptions about pixel layout (RGBA order, 0-1 normalization). No validation that layer.pixels matches expected dimensions.
- Safe modification: Add dimension checks and validate pixel buffer length before read/write operations.
- Test coverage: `BinaryStateManager.test.ts` has basic creation tests but no edge case tests for oversized/undersized buffers.

**WebGL Shader Compilation:**
- Files: `frontend/src/engine/renderer/WebGLRenderer.ts` (lines 108-124)
- Why fragile: Shader compilation errors are logged but not surfaced. Silently fails if shader source is malformed.
- Safe modification: Add return value validation and throw descriptive errors. Test with invalid shader code.
- Test coverage: No tests for WebGL renderer exist.

**React Context Initialization Order:**
- Files: `frontend/src/engine/react/ImageEngineContext.tsx` (lines 86-147)
- Why fragile: Multiple async operations (WASM init, WebGL init) with interdependencies. Race conditions possible if components use engines before both are ready.
- Safe modification: Add explicit initialization phase with `useEngineReady()` hook check everywhere engines are used.
- Test coverage: Tests don't verify initialization sequencing or error states.

**CORS Middleware Configuration:**
- Files: `backend/server.py` (lines 72-78)
- Why fragile: Splits CORS_ORIGINS by comma without trimming whitespace. Spaces in env var value break origin matching.
- Safe modification: Add `.strip()` to each origin after split.
- Test coverage: No backend tests for CORS configuration.

## Scaling Limits

**Layer Memory Consumption:**
- Current capacity: At 1200x800px with Float32Array (4 bytes/value), each layer uses ~15.4 MB
- Limit: Adding 50+ layers hits browser memory limits, history becomes unusable
- Scaling path: Implement layer tile system, lazy-load tiles, compress inactive layer pixel data.

**History Storage:**
- Current capacity: 50 history steps configured as maxHistorySize
- Limit: Large canvases + multiple steps can consume gigabytes if full screenshots stored
- Scaling path: Currently improved by diffs, but ensure diffs only store changed regions (currently broken - see Tech Debt).

**Browser Canvas Size:**
- Current capacity: Limited by WebGL max texture size (typically 4096x4096 on mobile, 16384+ on desktop)
- Limit: Larger canvases cause silent render failures or crashes
- Scaling path: Implement canvas tiling or split large projects into multiple documents.

## Dependencies at Risk

**@erase2d/fabric (v1.1.8):**
- Risk: Custom fork of fabric.js that may not receive updates. Unknown maintenance status.
- Impact: Bugs in canvas interaction, drawing tools, serialization are unfixable without fork maintenance.
- Migration plan: Evaluate standard fabric.js v6.9.0 (also in dependencies) for compatibility. Consider p5.js or Konva.js alternatives.

**fastapi (v0.110.1) - Backend:**
- Risk: Minor version specified. Future minor versions may break API contracts.
- Impact: Deployment could fail if dependencies resolve to incompatible versions.
- Migration plan: Pin to specific patch version (0.110.1) to ensure consistency.

**fabric (v6.9.0) - Duplicate Dependency:**
- Risk: Both fabric and @erase2d/fabric are installed. Creates bundle size bloat and version confusion.
- Impact: Unclear which library is actually used, potential namespace collisions.
- Migration plan: Remove one dependency. If using @erase2d/fabric, remove standard fabric. Update type definitions accordingly.

## Missing Critical Features

**No Image Import/Export:**
- Problem: Can't load external images into layers or export final composition as PNG/JPG
- Blocks: Basic functionality that users expect from image editor
- Workaround: Use browser DevTools to canvas.toDataURL() hack

**No Project Persistence API:**
- Problem: No backend endpoints to save/load projects to server
- Blocks: Sharing work, cloud sync, multi-device access
- Workaround: Local .FTS file download only

**No Undo/Redo Serialization:**
- Problem: History is lost on page reload
- Blocks: Workflow continuation after accidental refresh
- Workaround: Save project before refresh

## Test Coverage Gaps

**WebGL Renderer Not Tested:**
- What's not tested: Shader compilation, texture binding, rendering pipeline, framebuffer operations
- Files: `frontend/src/engine/renderer/WebGLRenderer.ts` (entire file)
- Risk: WebGL initialization failures, blend mode bugs, and rendering artifacts go undetected until user-facing
- Priority: High - affects visual output

**Backend API Not Tested:**
- What's not tested: Status check endpoints, CORS middleware, MongoDB integration, error handling
- Files: `backend/server.py` (entire file)
- Risk: Broken endpoints, database errors, and API contract changes undetected
- Priority: High - affects production stability

**Filter Application Edge Cases:**
- What's not tested: Invalid filter parameters, out-of-bounds values, WASM fallback behavior
- Files: `frontend/src/engine/filters/WasmFilterEngine.ts` (partial - only basic cases)
- Risk: Crashes on edge inputs, silent failures in JS fallback
- Priority: Medium - affects data integrity

**Layer Deletion Interactions:**
- What's not tested: Deleting active layer, undoing deletion, state consistency after deletes
- Files: `frontend/src/engine/state/BinaryStateManager.ts` (no deletion test)
- Risk: Orphaned references, undo failures after deletion
- Priority: Medium - affects workflow reliability

**React Hooks Integration:**
- What's not tested: useImageEngine hook behavior with missing context, useCanvasFilters error states
- Files: `frontend/src/engine/react/useCanvasFilters.ts` (no integration tests)
- Risk: Unhandled context errors, silent filter failures
- Priority: Medium - affects feature stability

---

*Concerns audit: 2026-01-22*
