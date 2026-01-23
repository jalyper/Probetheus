# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- JavaScript/JSX - React components and utilities in `src/`
- JavaScript (CommonJS) - Electron main process in `electron/main.cjs`, `electron/preload.cjs`, `electron/pdf-converter.cjs`

**Secondary:**
- CSS - Styling in `src/index.css`

## Runtime

**Environment:**
- Node.js - Server-side and build tooling (determined by package-lock.json lockfileVersion 3)
- Electron 39.2.3 - Desktop application runtime

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present and up-to-date

## Frameworks

**Core:**
- React 19.2.0 - UI framework for renderer process
- React DOM 19.2.0 - React DOM binding for web rendering

**Desktop:**
- Electron 39.2.3 - Cross-platform desktop framework
- electron-builder 26.0.12 - Application packaging and distribution

**Build/Dev:**
- Vite 7.2.4 - Development server and production bundler in `vite.config.js`
- @vitejs/plugin-react 5.1.1 - Vite React plugin with Fast Refresh
- vite-plugin-electron 0.29.0 - Electron main process bundling
- vite-plugin-electron-renderer 0.14.6 - Electron renderer process bundling

## Key Dependencies

**Critical:**
- docx 9.5.1 - DOCX file generation and manipulation in `src/utils/fileConversion.js` and `electron/pdf-converter.cjs`
- mammoth 1.11.0 - DOCX to HTML conversion in `src/utils/fileConversion.js`
- html2pdf.js 0.12.1 - HTML to PDF conversion in `src/hooks/useExport.js`
- pdf-parse 1.1.1 - PDF text extraction in `electron/pdf-converter.cjs`

**Utilities:**
- uuid 13.0.0 - Unique ID generation (v4) for page/file IDs in `src/components/Editor.jsx`
- date-fns 4.1.0 - Date utilities (imported but usage not visible in scanned files)
- lucide-react 0.554.0 - Icon library for UI components

**Development:**
- ESLint 9.39.1 - Code linting with flat config in `eslint.config.js`
- @eslint/js 9.39.1 - ESLint JavaScript rules
- eslint-plugin-react-hooks 7.0.1 - React hooks linting rules
- eslint-plugin-react-refresh 0.4.24 - React Fast Refresh linting

**Development Tools:**
- concurrently 9.2.1 - Run multiple npm scripts simultaneously (`electron:dev` script)
- cross-env 10.1.0 - Cross-platform environment variable setting
- wait-on 9.0.3 - Wait for server before launching Electron
- electron-is-dev 3.0.1 - Check if running in development mode (imported but not visible in scanned files)

## Configuration

**Build Configuration:**
- `vite.config.js` - Vite build configuration with React plugin, base path set to `./` for Electron asset loading
- `eslint.config.js` - ESLint flat config with React hooks and refresh plugins, targets ES2020 with JSX support
- `electron-builder` config in `package.json` - Platform-specific build settings for Windows (NSIS), macOS (DMG), Linux (AppImage)

**Electron Configuration:**
- App ID: `com.qwill.app`
- Product Name: `Qwill`
- Main entry: `electron/main.cjs`
- Preload script: `electron/preload.cjs`
- Context isolation: Enabled (security best practice)
- Node integration: Disabled

**Browser Configuration:**
- Content Security Policy in `index.html`: Allows self, unsafe-inline, unsafe-eval for scripts; self and unsafe-inline for styles

**Environment:**
- `NODE_ENV=development` flag used for dev mode detection in `electron/main.cjs`
- Port 5173 for Vite dev server hardcoded in `electron/main.cjs`

## Platform Requirements

**Development:**
- Node.js (version not explicitly specified, inferred from lockfileVersion 3 = Node 16.13.0+)
- npm
- git (implied)

**Production:**
- Windows (NSIS installer target)
- macOS (DMG target)
- Linux (AppImage target)
- Build artifacts: `dist/` (Vite output) and `dist-electron/` (Electron output)

---

*Stack analysis: 2026-01-22*
