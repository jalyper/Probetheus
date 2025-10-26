"use strict";
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");
const store = new Store({
  name: "probetheus-saves",
  cwd: app.getPath("userData")
});
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#000511",
    icon: path.join(__dirname, "../images/icon.png"),
    // Add your icon later
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true,
    // Hide menu bar for cleaner look
    title: "Probetheus"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("storage:get", async (event, key) => {
  try {
    return store.get(key);
  } catch (error) {
    console.error("Storage get error:", error);
    return null;
  }
});
ipcMain.handle("storage:set", async (event, key, value) => {
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error("Storage set error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:remove", async (event, key) => {
  try {
    store.delete(key);
    return { success: true };
  } catch (error) {
    console.error("Storage remove error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:clear", async () => {
  try {
    store.clear();
    return { success: true };
  } catch (error) {
    console.error("Storage clear error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:has", async (event, key) => {
  try {
    return store.has(key);
  } catch (error) {
    console.error("Storage has error:", error);
    return false;
  }
});
ipcMain.handle("storage:keys", async () => {
  try {
    const allData = store.store;
    return Object.keys(allData);
  } catch (error) {
    console.error("Storage keys error:", error);
    return [];
  }
});
ipcMain.handle("storage:getPath", async () => {
  return store.path;
});
console.log("Electron main process started");
console.log("Save data location:", store.path);
