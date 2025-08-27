@echo off
echo 🔍 Searching for ADB on your system...
echo.

:: Check if ADB is in PATH first
echo Testing if ADB is in PATH...
adb version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ ADB found in PATH!
    adb version | findstr /r "^Android"
    echo.
    echo Your ADB is properly configured. The app should work!
    goto :end
)

echo ❌ ADB not in PATH. Searching common locations...
echo.

:: Common ADB locations on Windows
set "paths[0]=C:\Android\platform-tools\adb.exe"
set "paths[1]=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "paths[2]=C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
set "paths[3]=C:\sdk\platform-tools\adb.exe"
set "paths[4]=%USERPROFILE%\Android\Sdk\platform-tools\adb.exe"

set found=0
for /l %%i in (0,1,4) do (
    call set "currentPath=%%paths[%%i]%%"
    if exist "!currentPath!" (
        echo ✅ Found ADB at: !currentPath!
        "!currentPath!" version 2>nul | findstr /r "^Android"
        set found=1
        set "foundPath=!currentPath!"
    )
)

if %found% == 1 (
    echo.
    echo 💡 SOLUTION: Copy adb.exe to your project folder
    echo    OR add the folder to your PATH:
    echo.
    for %%F in ("!foundPath!") do echo    %%~dpF
    echo.
    echo To add to PATH:
    echo 1. Press Win+R, type: sysdm.cpl
    echo 2. Click "Environment Variables"
    echo 3. Edit "Path" and add the folder above
    echo 4. Restart your command prompt
) else (
    echo ❌ ADB not found in common locations.
    echo.
    echo 💡 SOLUTIONS:
    echo 1. Download Android Platform Tools:
    echo    https://developer.android.com/studio/releases/platform-tools
    echo.
    echo 2. Extract and place in: C:\Android\platform-tools\
    echo.
    echo 3. Add C:\Android\platform-tools to your PATH
    echo.
    echo OR simply copy adb.exe to your project folder!
)

:end
echo.
pause