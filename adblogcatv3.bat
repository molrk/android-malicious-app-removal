@echo off
:: Change directory to platform-tools
cd /d C:\Android\platform-tools

:checkDevice
echo Checking for connected device...
for /f "skip=1 tokens=1,2" %%a in ('adb devices') do (
    if "%%a"=="" (
        rem empty line, skip
    ) else (
        if "%%b"=="device" (
            echo Device detected: %%a
            goto runLogcat
        )
    )
)

echo No device found. Please connect a device and try again.
pause
exit /b

:runLogcat
echo Starting adb logcat... (Press Ctrl+C to stop)
adb logcat

echo.
echo Logcat stopped. You can now enter other commands.
:commandLoop
set /p userCommand="Enter command (or type exit to quit): "
if /i "%userCommand%"=="exit" goto end
%userCommand%
goto commandLoop

:end
echo Goodbye!
pause
