const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let store;

// Initialize electron-store (ES module - must use dynamic import)
async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    name: 'probetheus-saves',
    cwd: app.getPath('userData')
  });
  console.log('electron-store initialized');
  console.log('Save data location:', store.path);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#000511',
    icon: path.join(__dirname, '../images/icon.png'), // Add your icon later
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow file:// protocol to load scripts
      webSecurity: true
    },
    autoHideMenuBar: true, // Hide menu bar for cleaner look
    title: 'Probetheus'
  });

  // Load the app
  const indexPath = path.join(__dirname, '../index.html');
  console.log('Loading index.html from:', indexPath);
  
  if (process.env.NODE_ENV === 'production') {
    // Production mode - load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Development mode - load source files directly
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.openDevTools(); // Auto-open DevTools in dev mode
  }

  // Log any errors during load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}]: ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initStore(); // Initialize store before creating window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Storage (replacing localStorage)
ipcMain.handle('storage:get', async (event, key) => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return null;
    }
    return store.get(key);
  } catch (error) {
    console.error('Storage get error:', error);
    return null;
  }
});

ipcMain.handle('storage:set', async (event, key, value) => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return { success: false, error: 'Store not initialized' };
    }
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error('Storage set error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:remove', async (event, key) => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return { success: false, error: 'Store not initialized' };
    }
    store.delete(key);
    return { success: true };
  } catch (error) {
    console.error('Storage remove error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:clear', async () => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return { success: false, error: 'Store not initialized' };
    }
    store.clear();
    return { success: true };
  } catch (error) {
    console.error('Storage clear error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:has', async (event, key) => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return false;
    }
    return store.has(key);
  } catch (error) {
    console.error('Storage has error:', error);
    return false;
  }
});

// Get all keys (useful for listing save slots)
ipcMain.handle('storage:keys', async () => {
  try {
    if (!store) {
      console.error('Store not initialized');
      return [];
    }
    // electron-store doesn't have a keys() method, so we get the entire store
    const allData = store.store;
    return Object.keys(allData);
  } catch (error) {
    console.error('Storage keys error:', error);
    return [];
  }
});

// Get storage path for debugging
ipcMain.handle('storage:getPath', async () => {
  if (!store) {
    return 'Store not initialized';
  }
  return store.path;
});

console.log('Electron main process started');
