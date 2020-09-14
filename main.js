const { app, BrowserWindow } = require('electron')
const ejse = require('ejs-electron');

ejse.data(
    {
      Title:"Electro app",
      Heading:"Excel",
      rows:100,
      cols:26
    }
  )
function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    show:false,
    webPreferences:{
      nodeIntegration:true,
      enableRemoteModule: true,
      allowRunningInsecureContent: true
    }
  })
  win.loadFile('index.ejs').then(function()
  {
      win.removeMenu();
      win.maximize();
      win.show();
      win.webContents.openDevTools();
  })
}
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

app.whenReady().then(createWindow)