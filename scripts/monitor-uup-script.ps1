param(
    [string]$ScriptPath,
    [string]$WorkingDirectory,
    [int]$Timeout = 60
)

# Set error handling
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Create log file paths
$logFile = Join-Path $WorkingDirectory "uup_monitor_log.txt"
$outputFile = Join-Path $WorkingDirectory "uup_output.log"
$exitCodeFile = Join-Path $WorkingDirectory "uup_exit_code.txt"
$statusFile = Join-Path $WorkingDirectory "uup_monitor_status.txt"

try {
    # Record start time
    $startTime = Get-Date
    
    # Record input parameters
    Write-Output "Monitor started at: $($startTime.ToString("MM/dd/yyyy HH:mm:ss"))" | Tee-Object -FilePath $logFile -Append
    Write-Output "Script Path: $ScriptPath" | Tee-Object -FilePath $logFile -Append
    Write-Output "Working Directory: $WorkingDirectory" | Tee-Object -FilePath $logFile -Append
    Write-Output "Timeout: $Timeout minutes" | Tee-Object -FilePath $logFile -Append
    
    # Check if script file exists
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Output "ERROR: Script file not found at $ScriptPath" | Tee-Object -FilePath $logFile -Append
        exit 1
    }
    
    # Check if working directory exists
    if (-not (Test-Path -Path $WorkingDirectory)) {
        Write-Output "ERROR: Working directory not found at $WorkingDirectory" | Tee-Object -FilePath $logFile -Append
        exit 1
    }
    
    # Change to working directory
    Set-Location -Path $WorkingDirectory
    
    # Get execution ISO file count before execution
    $isoFilesBefore = Get-ChildItem -Path . -Filter *.iso
    Write-Output "ISO files before execution: $($isoFilesBefore.Count)" | Tee-Object -FilePath $logFile -Append
    Write-Output "Starting UUP script..." | Tee-Object -FilePath $logFile -Append
    
    # Execute UUP script
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$ScriptPath`"" -Wait -PassThru -NoNewWindow
    $exitCode = $process.ExitCode
    
    Write-Output "UUP script completed with exit code: $exitCode" | Tee-Object -FilePath $logFile -Append
    
    # Get execution ISO file count after execution
    $isoFilesAfter = Get-ChildItem -Path . -Filter *.iso
    Write-Output "ISO files after execution: $($isoFilesAfter.Count)" | Tee-Object -FilePath $logFile -Append
    
    # Check if new ISO files were generated
    $newIso = $isoFilesAfter | Where-Object { $isoFilesBefore -notcontains $_ }
    
    if ($newIso) {
        $isoName = $newIso.Name
        $message = "SUCCESS:$isoName"
        Write-Output $message | Tee-Object -FilePath $logFile -Append
        "$message" | Out-File -FilePath $statusFile -Encoding UTF8
        exit 0
    } else {
        # If exit code is 0 but no file is created, it is also considered an error
        $errorMessage = "No new ISO file was created"
        Write-Output "ERROR: $errorMessage" | Tee-Object -FilePath $logFile -Append
        "ERROR:$errorMessage" | Out-File -FilePath $statusFile -Encoding UTF8
        exit 1
    }
    
} catch {
    $errorMessage = $_.Exception.Message
    "ERROR: $errorMessage" | Tee-Object -FilePath $logFile -Append -Encoding UTF8
    "ERROR:$errorMessage" | Out-File -FilePath $statusFile -Encoding UTF8
    exit 1
}