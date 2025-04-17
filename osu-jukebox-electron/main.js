const { app, BrowserWindow, Menu, globalShortcut, ipcMain } = require('electron')
require('@electron/remote/main').initialize()

let mainWindow;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: 'jb_icon.png'
  })

  mainWindow = win;
  require('@electron/remote/main').enable(win.webContents)
  win.loadFile('index.html')

  if (process.env.NODE_ENV !== 'development') {
    Menu.setApplicationMenu(null)
  }
}

app.whenReady().then(() => {
  createWindow()

  if (process.platform === 'win32') {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow.webContents.send('media-play-pause');
    });

    globalShortcut.register('MediaStop', () => {
        mainWindow.webContents.send('media-stop');
      });

    globalShortcut.register('VolumeUp', () => {
      mainWindow.webContents.send('media-volume-up');
    });

    globalShortcut.register('VolumeDown', () => {
      mainWindow.webContents.send('media-volume-down');
    });

    globalShortcut.register('MediaNextTrack', () => {
      mainWindow.webContents.send('media-next-track');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow.webContents.send('media-prev-track');
    });
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 