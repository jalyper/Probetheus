# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Not detected** - No remote API integrations found. Application is entirely local/offline.

## Data Storage

**Databases:**
- Not used - Application stores data as local files only

**File Storage:**
- Local filesystem only
- File operations handled through Electron IPC in `electron/main.cjs`:
  - `dialog:openFile` - Opens file dialog for DOCX selection
  - `dialog:saveFile` - Opens save dialog for DOCX export
  - `file:read` - Reads file buffer from filesystem
  - `file:write` - Writes file buffer to filesystem
  - `dialog:openPdf` - Opens file dialog for PDF selection
- Browser fallback in `src/components/Editor.jsx` using File System Access API and input fallback
- Files stored in user-selected locations with `.docx` extension

**Caching:**
- None detected - No caching layer used

## Authentication & Identity

**Auth Provider:**
- None - No authentication required. Application is single-user, local desktop app.

## Monitoring & Observability

**Error Tracking:**
- Not detected - No remote error tracking service

**Logs:**
- Browser console logging only (`console.log()`, `console.error()`)
- Logging present in:
  - `electron/main.cjs` - File write operations
  - `src/hooks/useElectronFileSystem.js` - File operations and errors
  - `electron/pdf-converter.cjs` - Conversion success/failure
  - `src/components/Editor.jsx` - PDF conversion debugging
- No persistent logging to files or remote services

## CI/CD & Deployment

**Hosting:**
- Desktop application (not web-hosted)
- Distributed via electron-builder with platform-specific installers

**CI Pipeline:**
- None detected - No GitHub Actions or other CI service configured

**Build/Distribution:**
- electron-builder configured for:
  - Windows: NSIS installer with icon
  - macOS: DMG with icon
  - Linux: AppImage with icon
- Output directory: `release/`
- Build files referenced: `dist/**/*`, `dist-electron/**/*`, `build/icon.png`

## Webhooks & Callbacks

**Incoming:**
- None - Application has no network endpoints

**Outgoing:**
- None - Application performs no remote callbacks

## Document Processing Integration

**Word Document (DOCX):**
- Library: `docx` 9.5.1
- Usage:
  - Generation from HTML: `src/utils/fileConversion.js` - `htmlToDocx()` function creates DOCX via Packer
  - Parsing for import: `mammoth` 1.11.0 - `src/utils/fileConversion.js` - `docxToHtml()` function converts DOCX to HTML
  - File operations: `electron/main.cjs` and `src/hooks/useElectronFileSystem.js`

**PDF:**
- Text extraction: `pdf-parse` 1.1.1 in `electron/pdf-converter.cjs`
- PDF to DOCX conversion: `src/electron/pdf-converter.cjs` - `convertPdfToDocx()` extracts text and creates DOCX
- HTML to PDF export: `html2pdf.js` 0.12.1 in `src/hooks/useExport.js` - `exportAsPdf()` function

## IPC (Inter-Process Communication) Interface

**Electron Main Process Handlers** (in `electron/main.cjs`):
- `dialog:openFile` - File open dialog for DOCX
- `dialog:saveFile` - File save dialog for DOCX
- `file:read` - Read file as buffer
- `file:write` - Write buffer to file
- `dialog:openPdf` - File open dialog for PDF
- `convert-pdf-to-docx` - Convert PDF to DOCX format

**Exposed API** (via `electron/preload.cjs` - `window.electronAPI`):
- `platform` - Process platform string
- `versions` - Node, Chrome, Electron version info
- `openFile()` - Dialog to select DOCX
- `saveFileDialog(defaultName)` - Dialog to save DOCX
- `readFile(filePath)` - Read file contents as buffer
- `writeFile(filePath, data)` - Write buffer to file
- `openPdf()` - Dialog to select PDF
- `convertPdfToDocx(pdfPath)` - Convert PDF to DOCX

## Security Context

**Sandbox:**
- Context isolation: Enabled in Electron
- Node integration: Disabled in Electron
- Preload script: Used to safely expose IPC methods

**CSP Policy** (in `index.html`):
- `default-src 'self' 'unsafe-inline' 'unsafe-eval'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob:`
- Note: Permissive policy required for inline styles and eval (Vite dev server, PDF generation)

## Environment Configuration

**No environment variables required** - Application requires no configuration or secrets. All paths are user-selected at runtime via file dialogs.

**Secrets location:**
- Not applicable - No API keys or secrets needed

---

*Integration audit: 2026-01-22*
