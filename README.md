# Quick Start Guide 🚀

**Problem Fixed!** The original package.json had a dependency that required Visual Studio build tools. This version is much simpler.

## ⚡ Super Quick Setup (Windows)

1. **Save all files** in a folder called `adb-logcat-gui`
2. **Double-click** `install.bat` (this will install only Electron)
3. **Run** `npm start` in the folder

## 🛠 Manual Setup (All Platforms)

### Step 1: Check Prerequisites
- ✅ **Node.js installed** (check with `node --version`)
- ✅ **ADB in your PATH** (optional, we'll detect it)

### Step 2: Install Electron Only
```bash
npm install electron@^27.0.0 --save-dev
```

### Step 3: Run the App
```bash
npm start
```

## 🚨 If You Still Get Errors

### "npm install" fails?
**Solution:** Use the install.bat script or install only Electron:
```bash
npm install electron --save-dev --no-optional
```

### "ADB not found"?
**Solution:** Download Android Platform Tools:
1. Go to: https://developer.android.com/studio/releases/platform-tools
2. Extract to `C:\Android\platform-tools\`
3. Add to Windows PATH or put `adb.exe` in the project folder

### App won't start?
**Check these:**
- Are you running `npm start` (not opening HTML directly)?
- Is the command prompt in the right folder?
- Do all files exist (package.json, main.js, preload.js, index.html)?

## 📁 Minimal File Structure
```
adb-logcat-gui/
├── package.json      ← App configuration
├── main.js           ← Electron main process  
├── preload.js        ← Security bridge
├── index.html        ← The GUI
├── install.bat       ← Windows installer (optional)
└── node_modules/     ← Created after npm install
    └── electron/     ← Only dependency we need!
```

## 🎯 What This Version Does

- ✅ **Simpler installation** (no build tools needed)
- ✅ **All the same features** (real ADB integration)
- ✅ **Works on all platforms** (Windows, Mac, Linux)  
- ✅ **Professional GUI** (same beautiful interface)

The complex `node-pty` dependency was for advanced terminal features we don't actually need. This version uses standard Node.js `spawn()` which works perfectly for ADB commands.

---

**Ready to go!** 🎉