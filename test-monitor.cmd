@echo off
echo Testing UUP Monitor Script
echo.

set "TEST_DIR=%~dp0test-monitor-output"
if exist "%TEST_DIR%" rmdir /s /q "%TEST_DIR%"
mkdir "%TEST_DIR%"

set "DUMMY_SCRIPT=%TEST_DIR%\dummy-uup-script.cmd"
echo @echo off > "%DUMMY_SCRIPT%"
echo echo Starting UUP script simulation... >> "%DUMMY_SCRIPT%"
echo timeout /t 5 /nobreak ^>nul >> "%DUMMY_SCRIPT%"
echo echo Creating dummy ISO file... >> "%DUMMY_SCRIPT%"
echo echo This is a test ISO file ^> "%TEST_DIR%\test-windows.iso" >> "%DUMMY_SCRIPT%"
echo timeout /t 3 /nobreak ^>nul >> "%DUMMY_SCRIPT%"
echo echo UUP script completed successfully! >> "%DUMMY_SCRIPT%"

echo Created dummy script: %DUMMY_SCRIPT%
echo.

set "MONITOR_SCRIPT=%~dp0scripts\monitor-uup-script.cmd"
echo Testing monitor script: %MONITOR_SCRIPT%
echo.

if not exist "%MONITOR_SCRIPT%" (
    echo ERROR: Monitor script not found!
    pause
    exit /b 1
)

echo Running monitor script...
echo.
call "%MONITOR_SCRIPT%" "%DUMMY_SCRIPT%" "%TEST_DIR%" "*.iso" "2"

echo.
echo Test completed. Check the results above.
echo.

echo Generated files in test directory:
dir "%TEST_DIR%"

echo.
pause