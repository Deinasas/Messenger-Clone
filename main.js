const { app, BrowserWindow, shell, Menu, screen } = require('electron');

let mainWindow;

function createWindow(url = 'https://messenger.com') {
  const displays = screen.getAllDisplays();
  const secondDisplay = displays[1] || displays[0];

  mainWindow = new BrowserWindow({
    x: secondDisplay.bounds.x,
    y: secondDisplay.bounds.y,
    width: 1000,
    height: 700,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false }
  });

  mainWindow.maximize();
  mainWindow.loadURL(url);

  // Handle new windows (links with target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isSameDomain = new URL(url).hostname.endsWith('messenger.com');
    if (isSameDomain) {
      mainWindow.loadURL(url);
    } else {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle in-page navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isSameDomain = new URL(url).hostname.endsWith('messenger.com');
    if (!isSameDomain) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Full-featured context menu
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menuTemplate = [];

    // Reload actions at the top
    menuTemplate.push({
      label: 'Reload',
      click: () => mainWindow.webContents.reload()
    });
    menuTemplate.push({
      label: 'Force Reload',
      click: () => mainWindow.webContents.reloadIgnoringCache()
    });
    menuTemplate.push({ type: 'separator' });

    // Edit actions (Cut, Copy, Paste, Delete, Select All)
    menuTemplate.push({ role: 'cut', enabled: params.editFlags.canCut });
    menuTemplate.push({ role: 'copy', enabled: params.editFlags.canCopy });
    menuTemplate.push({ role: 'paste', enabled: params.editFlags.canPaste });
    menuTemplate.push({ role: 'delete', enabled: params.editFlags.canDelete });
    menuTemplate.push({ role: 'selectAll', enabled: params.editFlags.canSelectAll });

    // Only add separator if there’s an image or link below
    if (params.hasImageContents || (params.linkURL && !params.hasImageContents)) {
      menuTemplate.push({ type: 'separator' });
    }

    // Open image in browser
    if (params.hasImageContents) {
      menuTemplate.push({
        label: 'Open Image in Browser',
        click: () => shell.openExternal(params.srcURL)
      });
    }

    // Open link in browser (not image)
    if (params.linkURL && !params.hasImageContents) {
      menuTemplate.push({
        label: 'Open Link in Browser',
        click: () => shell.openExternal(params.linkURL)
      });
    }

    // Only add separator before Inspect Element if something is above
    if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });

    // Inspect element
    menuTemplate.push({
      label: 'Inspect Element',
      click: () => mainWindow.webContents.inspectElement(params.x, params.y)
    });

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup();
  });

  // Clean up when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
