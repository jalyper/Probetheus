"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
let mainWindow;
let store;
async function initStore() {
  const Store = (await import("electron-store")).default;
  store = new Store({
    name: "probetheus-saves",
    cwd: app.getPath("userData")
  });
  console.log("electron-store initialized");
  console.log("Save data location:", store.path);
}
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
app.whenReady().then(async () => {
  await initStore();
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
    if (!store) {
      console.error("Store not initialized");
      return null;
    }
    return store.get(key);
  } catch (error) {
    console.error("Storage get error:", error);
    return null;
  }
});
ipcMain.handle("storage:set", async (event, key, value) => {
  try {
    if (!store) {
      console.error("Store not initialized");
      return { success: false, error: "Store not initialized" };
    }
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error("Storage set error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:remove", async (event, key) => {
  try {
    if (!store) {
      console.error("Store not initialized");
      return { success: false, error: "Store not initialized" };
    }
    store.delete(key);
    return { success: true };
  } catch (error) {
    console.error("Storage remove error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:clear", async () => {
  try {
    if (!store) {
      console.error("Store not initialized");
      return { success: false, error: "Store not initialized" };
    }
    store.clear();
    return { success: true };
  } catch (error) {
    console.error("Storage clear error:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("storage:has", async (event, key) => {
  try {
    if (!store) {
      console.error("Store not initialized");
      return false;
    }
    return store.has(key);
  } catch (error) {
    console.error("Storage has error:", error);
    return false;
  }
});
ipcMain.handle("storage:keys", async () => {
  try {
    if (!store) {
      console.error("Store not initialized");
      return [];
    }
    const allData = store.store;
    return Object.keys(allData);
  } catch (error) {
    console.error("Storage keys error:", error);
    return [];
  }
});
ipcMain.handle("storage:getPath", async () => {
  if (!store) {
    return "Store not initialized";
  }
  return store.path;
});
console.log("Electron main process started");
