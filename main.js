const { app, dialog, BrowserWindow, Menu } = require('electron')

const path = require('path')
const url = require('url')

let windows = []

const createWindow = () => {
  const win = new BrowserWindow({
    show: false,
    width: 256, height: 256, useContentSize: true,
    minWidth: 256, minHeight: 256,
    backgroundColor: '#000000'
  })

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  win.webContents.openDevTools()

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('closed', () => {
    windows.splice(windows.indexOf(win), 1)
  })

  win.on('resize', () => {
    const [ w, h ] = win.getContentSize()

    win.setAspectRatio(1)
  })

  windows.push(win)
}

const setupMenubar = () => {
  const menu = Menu.buildFromTemplate([
    {
      // Application menu
      submenu: [
        {
          label: 'About Unnamed Editor',
          click() {
            dialog.showMessageBox({
              type: 'info',
              message: 'Unnamed Editor (Calexico)',
              detail: 'Version Calexico (001), released.. not yet!'
            })
          }
        }
      ]
    },
    {
      label: 'File', submenu: [
        {
          label: 'New Window',
          accelerator: 'CommandOrControl+N',
          click() {
            createWindow()
          }
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
  createWindow()
  setupMenubar()
})

app.on('window-all-closed', () => {
  app.quit()
})
