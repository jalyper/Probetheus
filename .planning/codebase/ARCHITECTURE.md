# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Layered multi-tier architecture with performance-focused separation of concerns

**Key Characteristics:**
- React-based frontend with Fabric.js canvas layer
- Separate engine tier for performance-critical image processing
- WASM and WebGL integration for GPU-accelerated filters
- Monorepo structure with independent frontend, backend, and WASM-core packages
- Event-driven state management with history tracking

## Layers

**Presentation Layer:**
- Purpose: React components for UI and user interaction
- Location: `frontend/src/components/`
- Contains: Container components (PhotoshopEditor, Canvas, Toolbar, etc.), UI primitives from `components/ui/`
- Depends on: React, Fabric.js, React Router, Radix UI
- Used by: End users through the browser

**Canvas & Drawing Layer:**
- Purpose: Low-level drawing operations and brush mechanics
- Location: `frontend/src/components/Canvas.jsx`, `frontend/src/components/PressureSensitiveBrush.js`
- Contains: Fabric.js canvas initialization, brush implementations, pressure sensitivity handling
- Depends on: Fabric.js, @erase2d/fabric for eraser brush
- Used by: PhotoshopEditor component, drawing tools

**Engine Layer (High-Performance Image Processing):**
- Purpose: Centralized image processing with WebGL and WASM acceleration
- Location: `frontend/src/engine/`
- Contains: Renderer (WebGL), Filter Engine (WASM), State Manager (binary encoding), History Manager
- Depends on: WASM module, WebGL API, Float32Array for pixel data
- Used by: Components via React Context (ImageEngineProvider)

**Filter Processing:**
- Purpose: Apply image filters with optional WASM acceleration
- Location: `frontend/src/engine/filters/WasmFilterEngine.ts`
- Contains: Bridge between JS and WASM, fallback JS implementations for filters
- Depends on: WASM module (imported dynamically from `frontend/src/wasm/`)
- Used by: Canvas rendering pipeline, filter adjustments

**State Management:**
- Purpose: Efficient layer and canvas state tracking with binary encoding
- Location: `frontend/src/engine/state/`
- Contains: BinaryStateManager (efficient pixel storage), HistoryManager (undo/redo with diffs)
- Depends on: Float32Array, RegionDiff tracking
- Used by: PhotoshopEditor for layer operations and history

**Utilities & Data Format:**
- Purpose: Project serialization and utility functions
- Location: `frontend/src/utils/`
- Contains: FTS (Faux-Toe-Shop) format serializer/deserializer, File System Access API integration
- Depends on: File System Access API (Chrome/Edge)
- Used by: MenuBar for save/load operations

**WASM Core (Rust):**
- Purpose: High-performance image filter implementations
- Location: `wasm-core/src/lib.rs`, `wasm-core/src/filters/`, `wasm-core/src/color/`
- Contains: Filter algorithms (brightness, contrast, saturation, blur, grayscale, sepia, invert), color conversions
- Depends on: wasm_bindgen, Rust standard library
- Used by: WasmFilterEngine in frontend

**Backend (Optional):**
- Purpose: Project persistence and API endpoints
- Location: `backend/server.py`
- Contains: FastAPI application, MongoDB integration
- Depends on: FastAPI, Motor (async MongoDB driver), Pydantic
- Used by: Frontend for optional cloud save/load features

## Data Flow

**Drawing Operations:**
1. User input (mouse/pen) → Canvas component
2. Canvas component → Fabric.js event handlers
3. Fabric.js → PressureSensitiveBrush (if enabled) or default brush
4. Brush strokes → Fabric.js object manipulation
5. Canvas state → History manager (snapshot on action complete)

**Filter Application:**
1. Layer adjustment request → PhotoshopEditor state
2. PhotoshopEditor → ImageEngineContext/useCanvasFilters hook
3. Canvas pixels extracted as ImageData
4. ImageData → WasmFilterEngine.applyFilters()
5. WASM module processes pixels (or JS fallback)
6. Filtered ImageData → Canvas re-render

**Project Save:**
1. MenuBar save action → PhotoshopEditor
2. PhotoshopEditor → serializeProject() utility
3. Fabric.js canvas JSON + layer metadata → FTS format
4. FTS JSON → File System Access API or Backend API

**State Updates:**
1. Component action → Photo Editor state setter
2. State change → dependent useCallback handlers trigger
3. useCallback → ImageEngineContext methods if needed
4. Context provider updates subscribed components

**State Management:**
- PhotoshopEditor (component state) owns: activeTool, brushSize, brushOpacity, color, layers, activeLayerId, history, zoom, projectName, hasUnsavedChanges
- BinaryStateManager owns: efficient binary pixel representation
- HistoryManager owns: undo/redo stack with binary diffs of changed regions
- Layer object structure includes: id, name, visible, opacity, locked, adjustments (brightness, contrast, saturation, blur)

## Key Abstractions

**ImageEngineContext (React Context):**
- Purpose: Provider pattern for engine services
- Examples: `frontend/src/engine/react/ImageEngineContext.tsx`
- Pattern: React createContext + Provider wrapper, useContext hook for access
- Provides: renderer, filterEngine, stateManager, historyManager, applyFilters, undo/redo methods

**WasmFilterEngine:**
- Purpose: Abstraction over WASM filter module with JS fallback
- Examples: `frontend/src/engine/filters/WasmFilterEngine.ts`
- Pattern: Lazy loading of WASM with dynamic import, graceful degradation to JS
- Methods: init(), applyFilters(), processBrightnessInPlace(), etc.

**BinaryStateManager:**
- Purpose: Memory-efficient layer pixel storage using binary encoding
- Examples: `frontend/src/engine/state/BinaryStateManager.ts`
- Pattern: Class-based manager with Float32Array internal storage
- Operations: get/set layer pixel data, track dirty regions

**HistoryManager:**
- Purpose: Undo/redo with differential snapshots
- Examples: `frontend/src/engine/state/HistoryManager.ts`
- Pattern: Stack-based with RegionDiff storage (only changed pixels tracked)
- Limitation: 50-step limit configurable

**FTS Project Format:**
- Purpose: Portable project serialization
- Examples: `frontend/src/utils/ftsFormat.js`
- Pattern: JSON structure with version, layers, canvas data (Fabric.js JSON), metadata
- Version: 1.0

**Layer Type:**
- Purpose: Unified layer representation across component tree
- Structure: { id, name, visible, opacity, locked, adjustments: { brightness, contrast, saturation, blur } }
- Used in: PhotoshopEditor, LayersPanel, Canvas

## Entry Points

**Frontend Main Entry:**
- Location: `frontend/src/main.jsx`
- Triggers: Browser load
- Responsibilities: Mounts React app to DOM root element

**React App Root:**
- Location: `frontend/src/App.jsx`
- Triggers: React rendering
- Responsibilities: Sets up BrowserRouter, mounts PhotoshopEditor component, initializes toast notifications

**Main Editor Component:**
- Location: `frontend/src/components/PhotoshopEditor.jsx`
- Triggers: Route / matched
- Responsibilities: Initializes all editor state, manages tool/brush/layer state, coordinates Canvas/Toolbar/LayersPanel/HistoryPanel/MenuBar/PropertiesPanel

**Canvas Component:**
- Location: `frontend/src/components/Canvas.jsx`
- Triggers: Props change (activeTool, brushSize, color, etc.)
- Responsibilities: Manages Fabric.js canvas, handles drawing operations, emits history changes

**Menu Bar:**
- Location: `frontend/src/components/MenuBar.jsx`
- Triggers: User clicks menu items
- Responsibilities: Handles File operations (save/load), keyboard shortcuts

**WASM-Core Entry:**
- Location: `wasm-core/src/lib.rs`
- Triggers: Dynamic import from frontend
- Responsibilities: Exports ImageBuffer class and filter functions to JavaScript

**Backend Entry:**
- Location: `backend/server.py`
- Triggers: `python server.py` or ASGI server
- Responsibilities: FastAPI app initialization, CORS setup, MongoDB connection, route mounting

## Error Handling

**Strategy:** Defensive with graceful degradation

**Patterns:**
- WASM filter failures → logged warning, JS fallback filters used
- File system access failures → toast notification to user
- Missing WASM module → console warning, application continues with JS filters
- Canvas rendering failures → console error, UI remains responsive
- Invalid project files → error notification, default project created

## Cross-Cutting Concerns

**Logging:** Console-based (console.log/warn/error), structured with [ModuleName] prefix for debugging

**Validation:**
- Layer IDs are UUIDs
- Canvas dimensions: positive integers
- Filter values: normalized to -1.0 to 1.0 range (or 0-100 for blur)
- Project files validated by FTS_VERSION check

**Authentication:** Not implemented (frontend-only, backend optional)

**Performance Optimization:**
- WASM acceleration for filters
- WebGL for potential future rendering acceleration
- Binary state manager for memory-efficient layer storage
- Region diffs in history to avoid storing entire layer snapshots
- Lazy loading of WASM module (dynamic import)
- React StrictMode in development for detecting side effects

---

*Architecture analysis: 2026-01-22*
