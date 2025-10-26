# Electron + Vite Migration Guide for Probetheus

## ✅ What Has Been Set Up

### 1. **Electron Desktop Packaging**
- Main process: `electron/main.js`
- Preload script: `electron/preload.js` (secure IPC bridge)
- Window configuration optimized for 1920x1080 gameplay

### 2. **Vite Build System**
- Configuration: `vite.config.js`
- Hot module reload for development
- Optimized production builds
- Electron integration via plugins

### 3. **Storage System**
- `StorageAdapter` class: Universal storage interface
- Works with both localStorage (web) and electron-store (desktop)
- Automatic environment detection
- Async API for Electron compatibility

### 4. **Build Scripts**
```bash
npm run dev              # Vite dev server (web mode)
npm run dev:electron     # Vite dev server (Electron mode)
npm start                # Alias for dev:electron
npm run build            # Build web version
npm run build:electron   # Build Electron app for distribution
npm run electron         # Run Electron directly
```

---

## 🚧 Migration Status

### ✅ Completed
1. Installed dependencies (Vite, Electron, electron-store)
2. Created Electron main process and preload script
3. Created StorageAdapter for cross-platform storage
4. Configured Vite for Electron integration
5. Updated package.json with new scripts
6. Added electron-builder configuration for Steam builds
7. Updated index.html initialization to use async storage

### 🔄 In Progress - Files That Need Migration

#### Critical Files (Use localStorage):
1. **src/SaveManager.js** - Main save/load system (~500 lines)
   - 6 localStorage.getItem() calls
   - 4 localStorage.setItem() calls
   - 2 localStorage.removeItem() calls

2. **src/GameController.js** - Main game controller (~3600 lines)
   - 6+ localStorage calls for tutorial and timing

3. **src/TutorialManager.js** - Tutorial system
   - 5 localStorage calls for tutorial state

4. **src/IntroCutscene.js** - Intro cutscene
   - 2 localStorage calls for cutscene state

---

## 🔧 Migration Pattern

### Before (localStorage - Synchronous):
```javascript
// Old way - won't work in Electron
const saveData = localStorage.getItem('probetheus_save_auto');
localStorage.setItem('probetheus_save_auto', JSON.stringify(data));
localStorage.removeItem('probetheus_save_auto');
```

### After (StorageAdapter - Async):
```javascript
// New way - works everywhere
const saveData = await storageAdapter.getItem('probetheus_save_auto');
await storageAdapter.setItem('probetheus_save_auto', JSON.stringify(data));
await storageAdapter.removeItem('probetheus_save_auto');
```

### Function Requirements:
- Functions using storage must be `async`
- All storage calls must use `await`
- Error handling recommended

---

## 📋 Step-by-Step Migration Checklist

### Phase 1: Core Save System ⏳ NEXT
- [ ] Migrate SaveManager.js
  - [ ] createSaveData() method
  - [ ] saveGame() method
  - [ ] loadGame() method
  - [ ] getTutorialProgress() method
  - [ ] getSaveMetadata() method
  - [ ] deleteSave() method

### Phase 2: Game Controller
- [ ] Migrate GameController.js
  - [ ] Tutorial methods
  - [ ] Auto-save functionality
  - [ ] Offline progression timing

### Phase 3: Supporting Systems
- [ ] Migrate TutorialManager.js
- [ ] Migrate IntroCutscene.js

### Phase 4: Testing
- [ ] Test web version (npm run dev)
- [ ] Test Electron version (npm start)
- [ ] Test save/load in both modes
- [ ] Test auto-save functionality
- [ ] Update Playwright tests for async storage

---

## 🎯 Testing the New Setup

### Test Web Version:
```bash
npm run dev
# Opens browser at http://localhost:3000
# Should work exactly as before (uses localStorage)
```

### Test Electron Version:
```bash
npm start
# Opens Electron window
# Uses electron-store (desktop file system)
# Save location logged in console
```

### Check Save Location (Electron):
- **Windows**: `C:\Users\[User]\AppData\Roaming\probetheus-saves\`
- **Mac**: `~/Library/Application Support/probetheus-saves/`
- **Linux**: `~/.config/probetheus-saves/`

---

## 🚀 Building for Steam

### Development Build (Quick test):
```bash
npm run build:electron
```

### Production Build (For Steam):
```bash
npm run build:electron
# Creates installers in release/ folder:
# - Windows: .exe installer + portable .exe
# - Mac: .dmg installer + .zip
# - Linux: .AppImage + .deb package
```

### Steam Integration (Future):
1. Install steamworks.js: `npm install steamworks.js`
2. Add Steam achievement definitions
3. Configure Steam Cloud Saves
4. Test with Steam client

---

## 🐛 Known Issues & Solutions

### Issue 1: "Cannot find module 'electron'"
**Solution**: Make sure dependencies are installed:
```bash
npm install
```

### Issue 2: Save files not persisting in Electron
**Solution**: Check that storage migration is complete. Storage calls must be async.

### Issue 3: DevTools not opening
**Solution**: Uncomment `mainWindow.webContents.openDevTools()` in electron/main.js

### Issue 4: Hot reload not working
**Solution**: Use `npm start` instead of `npm run electron`

---

## 📖 Architecture Overview

```
probetheus/
├── electron/
│   ├── main.js          # Electron main process (Node.js environment)
│   └── preload.js       # Secure IPC bridge
├── src/
│   ├── StorageAdapter.js # Universal storage interface ✨ NEW
│   ├── SaveManager.js    # Needs migration ⚠️
│   ├── GameController.js # Needs migration ⚠️
│   └── [other game files]
├── dist/                 # Built web app (Vite output)
├── dist-electron/        # Built Electron files
├── release/              # Electron installers for distribution
├── vite.config.js        # Vite configuration ✨ NEW
├── index.html
└── package.json          # Updated with new scripts ✨ NEW
```

---

## 🎮 Development Workflow

### Daily Development:
1. Make changes to game code
2. Run `npm start` to test in Electron
3. Game auto-reloads on file changes
4. Check console for save file location

### Pre-Release Testing:
1. Run `npm run build:electron`
2. Test the built installer
3. Verify saves persist across app restarts
4. Check performance in production build

### Steam Release:
1. Final build with `npm run build:electron`
2. Upload to Steam partner portal
3. Configure Steam depots
4. Test with Steamworks integration

---

## 💡 Tips for Development

1. **Keep localStorage working**: The StorageAdapter maintains backward compatibility
2. **Test both modes**: Always test web and Electron versions
3. **Console logging**: Storage location is logged on startup
4. **Save file inspection**: electron-store files are JSON, easy to inspect
5. **Version migrations**: Plan for save format changes (already versioned at 1.0.0)

---

## 🆘 Need Help?

### Common Commands:
```bash
npm install              # Install all dependencies
npm start                # Run Electron app (development)
npm run dev              # Run web version (development)
npm run build:electron   # Build Electron installers
npm test                 # Run Playwright tests
```

### Files to Check When Debugging:
1. `electron/main.js` - Electron startup and IPC handlers
2. `src/StorageAdapter.js` - Storage abstraction layer
3. `vite.config.js` - Build configuration
4. Browser/Electron console - Storage operations logged here

---

## ✨ Benefits of This Setup

1. **Cross-platform**: Same codebase runs on web AND desktop
2. **Steam-ready**: Electron apps work natively on Steam
3. **Modern tooling**: Vite for fast builds and hot reload
4. **Professional saves**: File-based saves for desktop reliability
5. **Future-proof**: Easy to add Steam achievements, cloud saves, etc.

---

**Next Step**: Migrate SaveManager.js to use StorageAdapter (see migration pattern above)
