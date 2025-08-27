@echo off
echo Installing ADB Logcat GUI...
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Installing Electron (this may take a moment)...
npm install electron@^27.0.0 --save-dev

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install Electron!
    echo This might be due to network issues or permissions.
    echo Try running as Administrator or check your internet connection.
    pause
    exit /b 1
)

echo.
echo Installation complete!
echo.
echo To run the app, use: npm start
echo.
pause