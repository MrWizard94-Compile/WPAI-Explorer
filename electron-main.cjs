const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Check if we are running in development mode (by checking command line args or env)
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev, load the Vite dev server URL
    mainWindow.loadURL('http://localhost:3000');
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, we run the compiled Express server first, then load the port
    // However, for a fully bundled app, we would normally spin up the server in the main process here.
    // To keep it simple, we require the server entry point so it binds to port 3000
    require(path.join(__dirname, 'dist', 'server.cjs'));

    // Wait a brief moment for Express to bind, then load
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 1500);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
