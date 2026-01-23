# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
faux-toe-shop/
├── frontend/                      # React web application
│   ├── src/
│   │   ├── main.jsx              # Entry point
│   │   ├── App.jsx               # Root router component
│   │   ├── components/           # React components
│   │   ├── engine/               # High-performance image engine
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Client-side utilities
│   │   ├── utils/                # Project serialization, file I/O
│   │   ├── wasm/                 # WASM module (generated)
│   │   ├── assets/               # Images, fonts, static files
│   │   ├── index.css             # Global styles
│   │   └── App.css               # Root component styles
│   ├── public/                   # Static files served as-is
│   ├── plugins/                  # Vite plugins
│   ├── dist/                     # Built output (generated)
│   ├── package.json              # Node dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── vite.config.js            # Vite build config
│   └── README.md                 # Frontend documentation
├── wasm-core/                    # Rust WebAssembly image filters
│   ├── src/
│   │   ├── lib.rs               # Main WASM library
│   │   ├── filters/             # Filter implementations
│   │   └── color/               # Color space conversions
│   ├── pkg/                     # Compiled WASM output (generated)
│   ├── Cargo.toml               # Rust dependencies
│   └── README.md                # WASM documentation
├── backend/                      # FastAPI backend (optional)
│   ├── server.py                # FastAPI app, routes, MongoDB
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables (git-ignored)
├── tests/                        # Root-level test utilities
├── IMPLEMENTATION_PLAN.md        # Detailed technical roadmap
├── README.md                     # Project overview
├── package.json                  # Root monorepo config
└── .gitignore                    # Git exclusions
```

## Directory Purposes

**frontend/src:**
- Purpose: All frontend application code
- Contains: React components, styling, WASM integration, utilities, tests
- Key files: `main.jsx`, `App.jsx`, `setupTests.ts`

**frontend/src/components:**
- Purpose: React UI components
- Contains: PhotoshopEditor (main container), Canvas (Fabric.js wrapper), Toolbar, LayersPanel, HistoryPanel, PropertiesPanel, MenuBar, ColorPicker, UI primitives
- Key files: `PhotoshopEditor.jsx` (orchestrates all state), `Canvas.jsx` (main drawing surface)

**frontend/src/components/ui:**
- Purpose: Reusable UI building blocks
- Contains: 40+ Radix UI wrapped components (Button, Input, Dialog, Select, Dropdown, etc.)
- Pattern: Shadcn/ui library components with Tailwind styling
- Key files: `button.jsx`, `dialog.jsx`, `slider.jsx`, `toast.jsx`

**frontend/src/components/__tests__:**
- Purpose: Component unit tests
- Contains: Vitest + React Testing Library tests
- Key files: `Toolbar.test.tsx`, `Canvas.test.tsx`, `LayersPanel.test.tsx`, `PropertiesPanel.test.tsx`, `HistoryPanel.test.tsx`
- Pattern: One test file per component, uses testid attributes

**frontend/src/engine:**
- Purpose: High-performance image processing abstractions
- Contains: WebGL renderer, WASM filter engine, state managers, React context
- Key files: `index.ts` (barrel export), `types.ts` (shared types)

**frontend/src/engine/filters:**
- Purpose: WASM filter bridging and fallback implementations
- Contains: WasmFilterEngine class with dynamic WASM import
- Key files: `WasmFilterEngine.ts`

**frontend/src/engine/react:**
- Purpose: React bindings for the image engine
- Contains: ImageEngineContext (provider/hooks), useCanvasFilters hook
- Key files: `ImageEngineContext.tsx`, `useCanvasFilters.ts`, `index.ts`

**frontend/src/engine/state:**
- Purpose: Efficient state management with binary encoding
- Contains: BinaryStateManager, HistoryManager, type definitions
- Key files: `BinaryStateManager.ts`, `HistoryManager.ts`, `types.ts`

**frontend/src/engine/renderer:**
- Purpose: WebGL-based rendering (prepared for future use)
- Contains: WebGLRenderer class, GLSL shader definitions
- Key files: `WebGLRenderer.ts`, `shaders.ts`

**frontend/src/engine/workers:**
- Purpose: Web Worker integration (prepared for future)
- Contains: Off-main-thread processing (currently minimal)

**frontend/src/engine/__tests__:**
- Purpose: Engine unit tests
- Contains: Tests for BinaryStateManager, HistoryManager, WasmFilterEngine
- Key files: `BinaryStateManager.test.ts`, `HistoryManager.test.ts`, `WasmFilterEngine.test.ts`

**frontend/src/hooks:**
- Purpose: Custom React hooks
- Contains: use-toast hook for notifications
- Key files: `use-toast.js`

**frontend/src/lib:**
- Purpose: Client-side utility functions
- Contains: Helper functions, client context utilities
- Key files: Likely empty or minimal utilities

**frontend/src/utils:**
- Purpose: Core utilities and serialization
- Contains: FTS format serializer/deserializer, File System Access API wrapper
- Key files: `ftsFormat.js` (project save/load logic)

**frontend/src/utils/__tests__:**
- Purpose: Utility function tests
- Contains: Tests for FTS format
- Key files: `ftsFormat.test.js`

**frontend/src/wasm:**
- Purpose: WASM module loader location
- Contains: Generated files from `wasm-core` build (not in source)
- Key files: `faux_toe_shop_wasm.js`, `faux_toe_shop_wasm_bg.wasm`

**frontend/public:**
- Purpose: Static assets served as-is
- Contains: favicon, index.html (if any static HTML)

**frontend/dist:**
- Purpose: Production build output
- Contains: Bundled JS, CSS, WASM, assets
- Generated: Yes, by `npm run build`
- Committed: No

**wasm-core/src:**
- Purpose: Rust source code for WebAssembly
- Contains: Filter implementations, color conversions, ImageBuffer class
- Key files: `lib.rs` (WASM entry point), `filters/mod.rs`, `color/mod.rs`

**wasm-core/src/filters:**
- Purpose: Individual image filter implementations
- Contains: brightness.rs, contrast.rs, saturation.rs, blur.rs, grayscale.rs, sepia.rs, invert.rs, mod.rs
- Pattern: Each filter is a module with in-place processing functions

**wasm-core/src/color:**
- Purpose: Color space conversion utilities
- Contains: RGB/HSL conversions for filters
- Key files: `conversions.rs`, `mod.rs`

**wasm-core/pkg:**
- Purpose: Compiled WebAssembly output
- Contains: `.wasm` binary, JavaScript glue code, TypeScript definitions, `package.json`
- Generated: Yes, by `wasm-pack build`
- Committed: No

**backend:**
- Purpose: Optional FastAPI backend
- Contains: API routes, MongoDB integration, Pydantic models
- Key files: `server.py` (single file server), `requirements.txt` (Python deps)
- Status: Optional, used for cloud project persistence

**tests:**
- Purpose: Root-level test utilities
- Contains: Shared test helpers, fixtures
- Key files: Minimal, mostly for future expansion

## Key File Locations

**Entry Points:**
- `frontend/src/main.jsx`: React app bootstrap, mounts to DOM
- `frontend/src/App.jsx`: Routes configuration (currently single route)
- `frontend/src/components/PhotoshopEditor.jsx`: Main editor container, state orchestration
- `wasm-core/src/lib.rs`: WASM module export functions
- `backend/server.py`: FastAPI application

**Configuration:**
- `frontend/package.json`: Node dependencies, scripts
- `frontend/tsconfig.json`: TypeScript compiler options, path aliases (`@/` = `src/`)
- `frontend/vite.config.js`: Build configuration, WASM plugin setup
- `wasm-core/Cargo.toml`: Rust dependencies, wasm-pack configuration
- `frontend/src/setupTests.ts`: Vitest configuration, test environment

**Core Logic:**
- `frontend/src/components/Canvas.jsx`: Drawing operations, Fabric.js integration
- `frontend/src/components/PhotoshopEditor.jsx`: State management, prop coordination
- `frontend/src/engine/react/ImageEngineContext.tsx`: Engine initialization, context setup
- `frontend/src/engine/filters/WasmFilterEngine.ts`: Filter execution with WASM/JS fallback
- `frontend/src/utils/ftsFormat.js`: Project serialization (.fts file format)

**Testing:**
- `frontend/src/setupTests.ts`: Test environment initialization
- `frontend/src/components/__tests__/`: Component tests
- `frontend/src/engine/__tests__/`: Engine tests
- `frontend/src/utils/__tests__/`: Utility tests

## Naming Conventions

**Files:**
- React components: PascalCase.jsx (e.g., `PhotoshopEditor.jsx`, `Canvas.jsx`, `Toolbar.jsx`)
- TypeScript files: snake_case or PascalCase.ts depending on content (e.g., `setupTests.ts`, `BinaryStateManager.ts`)
- Test files: `*.test.tsx` or `*.test.ts` or `*.test.js` (e.g., `Toolbar.test.tsx`)
- Utilities: lowercase.js (e.g., `ftsFormat.js`, `use-toast.js`)
- CSS files: Match component name or feature (e.g., `App.css`, `index.css`)

**Directories:**
- Feature directories: lowercase (e.g., `components`, `engine`, `filters`, `utils`)
- UI primitives: lowercase matching component name (e.g., `ui/button.jsx`)
- Test directories: `__tests__` (Node.js convention)

**Components:**
- PascalCase function names: `PhotoshopEditor`, `Canvas`, `Toolbar`
- Hook naming: `use` prefix, camelCase (e.g., `useCanvasFilters`, `useImageEngine`, `use-toast`)
- Prop callbacks: `on` prefix + action (e.g., `onHistoryAdd`, `onLayersUpdate`, `onColorPick`)

**Variables:**
- State: camelCase (e.g., `activeTool`, `brushSize`, `layers`)
- Constants: UPPER_SNAKE_CASE or camelCase for feature flags (e.g., `MAX_HISTORY_SIZE`, `isInitialized`)
- Private/internal: underscore prefix (e.g., `_wasmModule`, `_initPromise`)

**Types:**
- Interfaces: PascalCase with `I` prefix or no prefix (e.g., `ImageEngineContextValue`, `FilterOptions`)
- Type aliases: PascalCase (e.g., `BlendMode`, `FilterParams`)
- Enums: Not used, string unions instead (e.g., `'normal' | 'multiply' | 'screen'`)

## Where to Add New Code

**New Feature:**
- Primary code: `frontend/src/components/` for UI, `frontend/src/engine/` for performance-critical
- Tests: Co-located `__tests__/` directory or `.test.tsx` suffix
- Example: Adding a new drawing tool → `frontend/src/components/YourTool.jsx` + `frontend/src/components/__tests__/YourTool.test.tsx`

**New Component/Module:**
- UI Components: `frontend/src/components/` (if complex) or `frontend/src/components/ui/` (if reusable primitive)
- Engine Features: `frontend/src/engine/[feature]/` with `index.ts` barrel export
- Utilities: `frontend/src/utils/yourUtility.js` with test at `frontend/src/utils/__tests__/yourUtility.test.js`

**Utilities:**
- Shared helpers: `frontend/src/utils/` or `frontend/src/lib/`
- Hooks: `frontend/src/hooks/useYourHook.js` or within `frontend/src/engine/react/`
- Constants: Define near usage or in `frontend/src/lib/constants.js` if shared

**WASM Additions:**
- New filter: Add `.rs` file in `wasm-core/src/filters/`, export in `wasm-core/src/filters/mod.rs`, bind in `wasm-core/src/lib.rs`
- Color conversion: Add to `wasm-core/src/color/conversions.rs`
- New type: Define in `wasm-core/src/lib.rs` with `#[wasm_bindgen]`

**Backend Routes:**
- API endpoints: Add to `backend/server.py` using `@api_router.get/post/put/delete`
- Models: Add Pydantic models at top of `backend/server.py`

## Special Directories

**frontend/dist:**
- Purpose: Production build artifacts
- Generated: Yes, via `npm run build`
- Committed: No (in .gitignore)
- Contains: Minified JS, CSS, WASM binary, source maps

**frontend/node_modules:**
- Purpose: Installed npm packages
- Generated: Yes, via `npm install`
- Committed: No (in .gitignore)
- Size: ~500MB+

**wasm-core/target:**
- Purpose: Rust build artifacts and compilation cache
- Generated: Yes, via `cargo build` or `wasm-pack build`
- Committed: No (in .gitignore)
- Contents: debug/release binaries, incremental compilation cache

**wasm-core/pkg:**
- Purpose: Compiled WASM module output
- Generated: Yes, via `wasm-pack build`
- Committed: No (in .gitignore)
- Contains: `*.wasm` binary, JS glue code, TypeScript definitions

**frontend/.emergent:**
- Purpose: Emergent design tool cache/metadata
- Generated: Yes
- Committed: No (probably in .gitignore)

**frontend/.claude:**
- Purpose: Claude Code plugin configuration
- Generated/Manually maintained: Likely mixed
- Committed: Possibly yes

---

*Structure analysis: 2026-01-22*
