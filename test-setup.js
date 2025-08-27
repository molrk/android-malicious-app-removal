// test-setup.js
// Run this file to test if your Electron setup is working

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Electron Setup...\n');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found!');
    console.log('💡 Make sure you are in the project directory');
    process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
    console.error('❌ node_modules not found!');
    console.log('💡 Run: npm install');
    process.exit(1);
}

// Check if main files exist
const requiredFiles = ['main.js', 'preload.js', 'index.html'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.error('❌ Missing files:', missingFiles);
    console.log('💡 Make sure all required files are in the project directory');
    process.exit(1);
}

// Test ADB availability
exec('adb version', (error, stdout, stderr) => {
    if (error) {
        console.warn('⚠️  ADB not found in PATH');
        console.log('💡 Install Android SDK Platform Tools and add to PATH');
    } else {
        console.log('✅ ADB found:', stdout.split('\n')[0]);
    }
    
    // Test Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        console.error('❌ Node.js version too old:', nodeVersion);
        console.log('💡 Please install Node.js v16 or later');
    } else {
        console.log('✅ Node.js version:', nodeVersion);
    }
    
    // Check Electron installation
    try {
        const electronVersion = require('electron/package.json').version;
        console.log('✅ Electron version:', electronVersion);
    } catch (e) {
        console.error('❌ Electron not installed!');
        console.log('💡 Run: npm install');
        process.exit(1);
    }
    
    console.log('\n🚀 Setup looks good! Try running: npm start');
});