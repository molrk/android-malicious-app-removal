const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let logcatProcess = null;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add your icon here
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Load the HTML file
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Debug: Check if preload worked
    mainWindow.webContents.executeJavaScript(`
      console.log('Electron API available:', !!window.electronAPI);
      if (!window.electronAPI) {
        console.error('Preload script failed to load!');
      }
    `);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Kill logcat process if running
    if (logcatProcess) {
      try {
        if (process.platform === 'win32') {
          const { spawn } = require('child_process');
          spawn('taskkill', ['/pid', logcatProcess.pid, '/t', '/f']);
        } else {
          logcatProcess.kill('SIGKILL');
        }
      } catch (e) {
        // Process already dead
      }
      logcatProcess = null;
    }
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for ADB operations

// Check for connected devices
ipcMain.handle('check-devices', async () => {
  const adbCommand = global.adbPath || 'adb';
  
  return new Promise((resolve, reject) => {
    exec(`"${adbCommand}" devices`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message });
        return;
      }

      const lines = stdout.split('\n').filter(line => line.trim() !== '');
      const devices = [];
      
      // Skip first line which is "List of devices attached"
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split('\t');
          if (parts.length >= 2 && parts[1] === 'device') {
            devices.push({
              id: parts[0],
              status: parts[1]
            });
          }
        }
      }

      resolve({ 
        success: true, 
        devices: devices,
        raw: stdout 
      });
    });
  });
});

// Get device info
ipcMain.handle('get-device-info', async (event, deviceId) => {
  const adbCommand = global.adbPath || 'adb';
  
  return new Promise((resolve, reject) => {
    const commands = [
      `"${adbCommand}" shell getprop ro.product.model`,
      `"${adbCommand}" shell getprop ro.product.manufacturer`, 
      `"${adbCommand}" shell getprop ro.build.version.release`
    ];

    Promise.all(commands.map(cmd => {
      return new Promise((res, rej) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) res('Unknown');
          else res(stdout.trim());
        });
      });
    })).then(results => {
      resolve({
        model: results[0],
        manufacturer: results[1],
        androidVersion: results[2]
      });
    });
  });
});

// Start logcat
ipcMain.handle('start-logcat', async (event, options = {}) => {
  if (logcatProcess) {
    return { success: false, error: 'Logcat is already running' };
  }

  try {
    const adbCommand = global.adbPath || 'adb';
    
    // Build adb logcat command with options
    let args = ['logcat'];
    
    if (options.clear) args.push('-c');
    if (options.filter) args.push('-s', options.filter);
    if (options.format) args.push('-v', options.format);
    
    logcatProcess = spawn(adbCommand, args);

    logcatProcess.stdout.on('data', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('logcat-data', data.toString());
      }
    });

    logcatProcess.stderr.on('data', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('logcat-error', data.toString());
      }
    });

    logcatProcess.on('close', (code) => {
      logcatProcess = null;
      if (mainWindow) {
        // Check if this was due to device disconnect
        if (code !== 0) {
          mainWindow.webContents.send('logcat-error', 'Device may have disconnected or ADB connection lost');
        }
        mainWindow.webContents.send('logcat-closed', code);
      }
    });

    logcatProcess.on('error', (error) => {
      logcatProcess = null;
      if (mainWindow) {
        if (error.code === 'ENOENT') {
          mainWindow.webContents.send('logcat-error', 'ADB command not found. Please check ADB installation.');
        } else {
          mainWindow.webContents.send('logcat-error', error.message);
        }
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop logcat
ipcMain.handle('stop-logcat', async () => {
  if (logcatProcess) {
    try {
      // On Windows, we need to kill the process tree to stop ADB properly
      if (process.platform === 'win32') {
        const { spawn } = require('child_process');
        spawn('taskkill', ['/pid', logcatProcess.pid, '/t', '/f']);
      } else {
        // On Unix-like systems
        logcatProcess.kill('SIGTERM');
        
        // Force kill after 2 seconds if it doesn't respond
        setTimeout(() => {
          if (logcatProcess && !logcatProcess.killed) {
            logcatProcess.kill('SIGKILL');
          }
        }, 2000);
      }
      
      logcatProcess = null;
      return { success: true };
    } catch (error) {
      logcatProcess = null;
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Logcat is not running' };
});

// Execute custom ADB command
ipcMain.handle('execute-adb-command', async (event, command) => {
  const adbCommand = global.adbPath || 'adb';
  
  return new Promise((resolve, reject) => {
    // Replace 'adb' at the start of the command with our found ADB path
    let fullCommand = command;
    if (command.toLowerCase().startsWith('adb ')) {
      fullCommand = `"${adbCommand}" ` + command.substring(4);
    } else if (!command.includes(adbCommand)) {
      fullCommand = `"${adbCommand}" ${command}`;
    }
    
    exec(fullCommand, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ 
          success: false, 
          error: error.message,
          stderr: stderr 
        });
        return;
      }

      resolve({ 
        success: true, 
        stdout: stdout,
        stderr: stderr 
      });
    });
  });
});

// Save log to file
ipcMain.handle('save-log', async (event, logContent, filename) => {
  return new Promise((resolve, reject) => {
    const { dialog } = require('electron');
    
    dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Log Files', extensions: ['log'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }).then(result => {
      if (!result.canceled && result.filePath) {
        fs.writeFile(result.filePath, logContent, 'utf8', (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, path: result.filePath });
          }
        });
      } else {
        resolve({ success: false, error: 'Save canceled' });
      }
    }).catch(err => {
      resolve({ success: false, error: err.message });
    });
  });
});

// Check if ADB is available with multiple path checking
ipcMain.handle('check-adb', async () => {
  // Common ADB installation paths on Windows
  const commonPaths = [
    'adb', // In PATH
    'C:\\Android\\platform-tools\\adb.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    'C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe',
    'C:\\sdk\\platform-tools\\adb.exe',
    path.join(__dirname, 'adb.exe') // In project folder
  ];

  // Try each path
  for (const adbPath of commonPaths) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`"${adbPath}" version`, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            resolve(null);
          } else {
            resolve({ path: adbPath, version: stdout.split('\n')[0] });
          }
        });
      });
      
      if (result) {
        // Store the working ADB path for other functions
        global.adbPath = adbPath;
        return { 
          available: true, 
          version: result.version,
          path: result.path
        };
      }
    } catch (e) {
      continue;
    }
  }

  return { 
    available: false, 
    error: 'ADB not found in common locations. Please add ADB to PATH or place adb.exe in the project folder.',
    searchedPaths: commonPaths
  };
});

// Add this to main.js after the other IPC handlers

let deviceMonitorInterval = null;

// Start monitoring devices when app starts
app.whenReady().then(() => {
  createWindow();
  startDeviceMonitoring();
});

// Stop monitoring when app closes
app.on('window-all-closed', () => {
  stopDeviceMonitoring();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function startDeviceMonitoring() {
  // Check device status every 3 seconds
  deviceMonitorInterval = setInterval(async () => {
    if (mainWindow && global.adbPath) {
      try {
        const result = await new Promise((resolve) => {
          exec(`"${global.adbPath}" devices`, { timeout: 3000 }, (error, stdout, stderr) => {
            if (error) {
              resolve({ devices: [] });
            } else {
              const lines = stdout.split('\n').filter(line => line.trim() !== '');
              const devices = [];
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                  const parts = line.split('\t');
                  if (parts.length >= 2 && parts[1] === 'device') {
                    devices.push({ id: parts[0], status: parts[1] });
                  }
                }
              }
              resolve({ devices });
            }
          });
        });
        
        // Notify renderer about device status
        mainWindow.webContents.send('device-status-changed', result.devices);
        
        // If logcat is running but no devices, stop it
        if (logcatProcess && result.devices.length === 0) {
          mainWindow.webContents.send('logcat-error', 'Device disconnected - stopping logcat');
          if (process.platform === 'win32') {
            const { spawn } = require('child_process');
            spawn('taskkill', ['/pid', logcatProcess.pid, '/t', '/f']);
          } else {
            logcatProcess.kill('SIGTERM');
          }
          logcatProcess = null;
          mainWindow.webContents.send('logcat-closed', -1);
        }
        
      } catch (error) {
        // Silently ignore monitoring errors to avoid spam
      }
    }
  }, 3000);
}

function stopDeviceMonitoring() {
  if (deviceMonitorInterval) {
    clearInterval(deviceMonitorInterval);
    deviceMonitorInterval = null;
  }
}

