const { app, BrowserWindow, Menu } = require('electron')
require('@electron/remote/main').initialize()

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

  require('@electron/remote/main').enable(win.webContents)
  win.loadFile('index.html')

  if (process.env.NODE_ENV !== 'development') {
    Menu.setApplicationMenu(null)
  }
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 