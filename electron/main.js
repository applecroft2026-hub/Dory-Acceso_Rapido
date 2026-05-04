import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let configPath = '';

const iconPath = isDev 
  ? path.join(__dirname, '../image.png') 
  : path.join(process.resourcesPath, 'image.png');

const DEFAULT_APPS = [
  { id: '1', name: 'Explorador de archivos', path: 'explorer.exe', icon: 'file-explorer' },
  { id: '2', name: 'Calculadora', path: 'calc.exe', icon: 'calculator' },
  { id: '3', name: 'Firefox', path: 'firefox.exe', icon: 'firefox' },
  { id: '4', name: 'Notas', path: 'notepad.exe', icon: 'notes' }
];

function loadAppsConfig() {
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error loading config', err);
    }
  }
  return DEFAULT_APPS;
}

function saveAppsConfig(apps) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(apps, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    frame: false,
    transparent: true,
    icon: iconPath,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false, // Don't show initially
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const url = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(url);

  // Once ready, just sit in background.
  mainWindow.on('ready-to-show', () => {
    // window is ready, but hidden
  });

  mainWindow.on('blur', () => {
    mainWindow.hide();
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.center();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('window-opened'); // To display the "dot" if opened again
  }
}

app.whenReady().then(() => {
  configPath = path.join(app.getPath('userData'), 'dory-apps.json');

  // Ensure default apps load and save if not there
  if (!fs.existsSync(configPath)) {
    saveAppsConfig(DEFAULT_APPS);
  }

  createWindow();

  // Global Shortcut
  globalShortcut.register('CommandOrControl+L', () => {
    toggleWindow();
  });

  // Tray Integration
  tray = new Tray(nativeImage.createFromPath(iconPath)); 
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar Dory', click: () => toggleWindow() },
    { label: 'Salir', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Dory App Launcher');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    toggleWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-apps', () => {
  return loadAppsConfig();
});

ipcMain.handle('save-apps', (event, apps) => {
  saveAppsConfig(apps);
  return true;
});

ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('launch-app', (event, appPath) => {
  if (mainWindow) mainWindow.hide(); // Hide before launching
  try {
    // We wrap appPath in quotes to handle spaces
    exec(`start "" "${appPath}"`, (err) => {
      if (err) {
         console.warn(`Failed to execute ${appPath}`, err);
      }
    });
  } catch (err) {
    console.error('Error executing file:', err);
  }
});

ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'ico'] }]
  });
  if (result.canceled) return null;
  
  const filePath = result.filePaths[0];
  const fileExt = path.extname(filePath).toLowerCase().replace('.', '');
  // Read file to Base64
  const base64Data = fs.readFileSync(filePath, 'base64');
  return `data:image/${fileExt === 'ico' ? 'x-icon' : fileExt};base64,${base64Data}`;
});

ipcMain.handle('dialog:openExe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Ejecutables', extensions: ['exe'] }]
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});
