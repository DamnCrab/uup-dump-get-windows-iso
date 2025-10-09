@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo [MONITOR] UUP Script Monitor Started
echo [MONITOR] Target Script: %~1
echo [MONITOR] Working Directory: %~2
echo [MONITOR] Expected ISO Pattern: %~3
echo [MONITOR] Timeout (minutes): %~4
echo.

if "%~1"=="" (
    echo [ERROR] Missing script path parameter
    exit /b 1
)

if "%~2"=="" (
    echo [ERROR] Missing working directory parameter
    exit /b 1
)

set "SCRIPT_PATH=%~1"
set "WORK_DIR=%~2"
set "ISO_PATTERN=%~3"
set "TIMEOUT_MINUTES=%~4"

if "%ISO_PATTERN%"=="" set "ISO_PATTERN=*.iso"
if "%TIMEOUT_MINUTES%"=="" set "TIMEOUT_MINUTES=30"

echo [MONITOR] Script path: %SCRIPT_PATH%
echo [MONITOR] Work directory: %WORK_DIR%

if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Script file not found: %SCRIPT_PATH%
    exit /b 1
)

if not exist "%WORK_DIR%" (
    echo [ERROR] Working directory not found: %WORK_DIR%
    exit /b 1
)

cd /d "%WORK_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to change to working directory: %WORK_DIR%
    exit /b 1
)

echo [MONITOR] Changed to working directory: %CD%
echo.

set "STATUS_FILE=%WORK_DIR%\uup_monitor_status.txt"
set "LOG_FILE=%WORK_DIR%\uup_monitor_log.txt"
set "EXIT_CODE_FILE=%WORK_DIR%\uup_exit_code.txt"
set "OUTPUT_LOG=%WORK_DIR%\uup_output.log"

if exist "%STATUS_FILE%" del "%STATUS_FILE%"
if exist "%EXIT_CODE_FILE%" del "%EXIT_CODE_FILE%"
if exist "%OUTPUT_LOG%" del "%OUTPUT_LOG%"

echo RUNNING > "%STATUS_FILE%"
echo [%date% %time%] Monitor started > "%LOG_FILE%"

echo [MONITOR] Starting UUP script: %SCRIPT_PATH%
echo [MONITOR] Output will be logged to: %OUTPUT_LOG%
echo [MONITOR] Exit code will be written to: %EXIT_CODE_FILE%

REM Check if we're in CI environment
if defined GITHUB_ACTIONS (
    echo [MONITOR] Detected GitHub Actions environment, using direct execution
    call "%SCRIPT_PATH%" > "%OUTPUT_LOG%" 2>&1
    echo %errorlevel% > "%EXIT_CODE_FILE%"
) else (
    echo [MONITOR] Using background execution for local environment
    start /b cmd /c "call "%SCRIPT_PATH%" > "%OUTPUT_LOG%" 2>&1 & echo %%errorlevel%% > "%EXIT_CODE_FILE%""
)

set /a "TIMEOUT_SECONDS=%TIMEOUT_MINUTES% * 60"
set /a "CHECK_INTERVAL=5"
set /a "ELAPSED_SECONDS=0"

echo [MONITOR] Monitoring with %TIMEOUT_MINUTES% minute timeout
echo [MONITOR] Check interval: %CHECK_INTERVAL% seconds
echo.

:MONITOR_LOOP
REM In CI environment, wait a bit for the exit code file to be written
if defined GITHUB_ACTIONS (
    echo [MONITOR] CI environment detected, waiting for exit code file...
    set /a "CI_WAIT_COUNT=0"
    :CI_WAIT_LOOP
    if exist "%EXIT_CODE_FILE%" (
        echo [MONITOR] Exit code file found, reading result...
        timeout /t 1 /nobreak >nul 2>&1
        for /f "tokens=*" %%a in ("%EXIT_CODE_FILE%") do set "SCRIPT_EXIT_CODE=%%a"
        echo [MONITOR] UUP script completed with exit code: !SCRIPT_EXIT_CODE!
        
        if "!SCRIPT_EXIT_CODE!"=="0" (
            echo [MONITOR] UUP script completed successfully
            goto CHECK_ISO
        ) else (
            echo [ERROR] UUP script failed with exit code: !SCRIPT_EXIT_CODE!
            echo [ERROR] Check output log: %OUTPUT_LOG%
            if exist "%OUTPUT_LOG%" (
                echo [ERROR] Last 10 lines of output:
                powershell -Command "Get-Content '%OUTPUT_LOG%' | Select-Object -Last 10"
            )
            echo FAILED:!SCRIPT_EXIT_CODE! > "%STATUS_FILE%"
            exit /b 1
        )
    )
    
    set /a "CI_WAIT_COUNT+=1"
    if !CI_WAIT_COUNT! lss 10 (
        echo [MONITOR] Waiting for exit code file... (!CI_WAIT_COUNT!/10)
        timeout /t 2 /nobreak >nul 2>&1
        goto CI_WAIT_LOOP
    )
    
    echo [ERROR] Exit code file not found after waiting in CI environment
    echo FAILED:NO_EXIT_CODE > "%STATUS_FILE%"
    exit /b 1
)

echo [MONITOR] Checking for exit code file: %EXIT_CODE_FILE%
if exist "%EXIT_CODE_FILE%" (
    for /f "tokens=*" %%a in ("%EXIT_CODE_FILE%") do set "SCRIPT_EXIT_CODE=%%a"
    echo [MONITOR] UUP script completed with exit code: !SCRIPT_EXIT_CODE!
    
    if "!SCRIPT_EXIT_CODE!"=="0" (
        echo [MONITOR] UUP script completed successfully
        goto CHECK_ISO
    ) else (
        echo [ERROR] UUP script failed with exit code: !SCRIPT_EXIT_CODE!
        echo [ERROR] Check output log: %OUTPUT_LOG%
        if exist "%OUTPUT_LOG%" (
            echo [ERROR] Last 10 lines of output:
            powershell -Command "Get-Content '%OUTPUT_LOG%' | Select-Object -Last 10"
        )
        echo FAILED:!SCRIPT_EXIT_CODE! > "%STATUS_FILE%"
        exit /b 1
    )
)

for %%f in (%ISO_PATTERN%) do (
    if exist "%%f" (
        set "ISO_SIZE=0"
        for %%s in ("%%f") do set "ISO_SIZE=%%~zs"
        
        if !ISO_SIZE! GTR 104857600 (
            echo [MONITOR] Found large ISO file: %%f (!ISO_SIZE! bytes)
            
            timeout /t 5 /nobreak >nul
            
            set "NEW_SIZE=0"
            for %%s in ("%%f") do set "NEW_SIZE=%%~zs"
            
            if !NEW_SIZE! EQU !ISO_SIZE! (
                echo [MONITOR] ISO file size is stable, checking if script finished
                timeout /t 10 /nobreak >nul
                
                if exist "%EXIT_CODE_FILE%" (
                    goto CHECK_ISO
                )
            )
        )
    )
)

set /a "ELAPSED_SECONDS+=CHECK_INTERVAL"
if !ELAPSED_SECONDS! GEQ !TIMEOUT_SECONDS! (
    echo [ERROR] Timeout reached (%TIMEOUT_MINUTES% minutes)
    echo [ERROR] Check output log: %OUTPUT_LOG%
    if exist "%OUTPUT_LOG%" (
        echo [ERROR] Last 20 lines of output:
        powershell -Command "Get-Content '%OUTPUT_LOG%' | Select-Object -Last 20"
    )
    echo TIMEOUT > "%STATUS_FILE%"
    exit /b 1
)

set /a "REMAINING_MINUTES=(%TIMEOUT_SECONDS% - %ELAPSED_SECONDS%) / 60"
echo [MONITOR] Elapsed: !ELAPSED_SECONDS!s, Remaining: !REMAINING_MINUTES!m

timeout /t %CHECK_INTERVAL% /nobreak >nul
goto MONITOR_LOOP

:CHECK_ISO
echo [MONITOR] Checking for generated ISO files...

set "FOUND_ISO="
set "LARGEST_ISO="
set "LARGEST_SIZE=0"

for %%f in (%ISO_PATTERN%) do (
    if exist "%%f" (
        set "CURRENT_SIZE=0"
        for %%s in ("%%f") do set "CURRENT_SIZE=%%~zs"
        
        if !CURRENT_SIZE! GTR !LARGEST_SIZE! (
            set "LARGEST_ISO=%%f"
            set "LARGEST_SIZE=!CURRENT_SIZE!"
        )
        
        echo [MONITOR] Found ISO: %%f (!CURRENT_SIZE! bytes)
    )
)

if defined LARGEST_ISO (
    echo [SUCCESS] Generated ISO file: !LARGEST_ISO!
    echo [SUCCESS] File size: !LARGEST_SIZE! bytes
    echo SUCCESS:!LARGEST_ISO! > "%STATUS_FILE%"
    echo [%date% %time%] Success: !LARGEST_ISO! >> "%LOG_FILE%"
    exit /b 0
) else (
    echo [ERROR] No ISO files found
    echo ERROR:NO_ISO_FOUND > "%STATUS_FILE%"
    echo [%date% %time%] Error: No ISO found >> "%LOG_FILE%"
    exit /b 1
)