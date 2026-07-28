const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let serverHandle = null;

const isDev = !app.isPackaged;
const devUrl = process.env.WPAI_DESKTOP_DEV_URL || 'http://127.0.0.1:3000';

async function startPackagedServer() {
  if (serverHandle) return serverHandle.url;

  const serverModulePath = path.join(__dirname, 'dist', 'server.cjs');
  const { startServer } = require(serverModulePath);
  process.env.NODE_ENV = 'production';
  serverHandle = await startServer({
    host: '127.0.0.1',
    port: 0,
    staticDir: path.join(__dirname, 'dist'),
    log: false
  });
  return serverHandle.url;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'WPAI Explorer',
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const targetUrl = isDev ? devUrl : await startPackagedServer();
  await mainWindow.loadURL(targetUrl);
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    void createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverHandle?.server) {
    serverHandle.server.close();
  }
});
