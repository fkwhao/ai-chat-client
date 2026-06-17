const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        minWidth: 600,
        minHeight: 500,
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    // Send maximize state changes to renderer
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized-change', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-maximized-change', false);
    });
}

// ── IPC handlers ──
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});
ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
