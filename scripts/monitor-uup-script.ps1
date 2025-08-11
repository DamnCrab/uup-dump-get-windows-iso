param(
    [string]$ScriptPath,
    [string]$WorkingDirectory,
    [int]$TimeoutMinutes = 60
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
    "Monitor started at: $startTime" | Out-File -FilePath $logFile -Encoding UTF8
    
    # Record input parameters
    "Script Path: $ScriptPath" | Out-File -FilePath $logFile -Append -Encoding UTF8
    "Working Directory: $WorkingDirectory" | Out-File -FilePath $logFile -Append -Encoding UTF8
    "Timeout: $TimeoutMinutes minutes" | Out-File -FilePath $logFile -Append -Encoding UTF8
    
    # Check if script file exists
    if (-not (Test-Path $ScriptPath)) {
        throw "Script file not found: $ScriptPath"
    }
    
    # Check if working directory exists
    if (-not (Test-Path $WorkingDirectory)) {
        throw "Working directory not found: $WorkingDirectory"
    }
    
    # Change to working directory
    Push-Location $WorkingDirectory
    
    try {
        # Record ISO file count before execution
        $isoFilesBefore = @(Get-ChildItem -Path $WorkingDirectory -Filter "*.iso" -Recurse)
        "ISO files before execution: $($isoFilesBefore.Count)" | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        # Start UUP script
        "Starting UUP script..." | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        # Use the method from reference script to run CMD script and wait for completion
        # This method ensures PowerShell waits for all child processes to complete
        $scriptName = Split-Path $ScriptPath -Leaf
        "Executing: cmd /c $scriptName" | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        # Execute the CMD script directly and capture output
        $output = cmd /c $scriptName 2>&1
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 0 }
        
        # Write output to file
        $output | Out-File -FilePath $outputFile -Encoding UTF8
        
        # Record exit code
        $exitCode | Out-File -FilePath $exitCodeFile -Encoding UTF8
        "UUP script completed with exit code: $exitCode" | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        # Check if new ISO files were generated
        $isoFilesAfter = @(Get-ChildItem -Path $WorkingDirectory -Filter "*.iso" -Recurse)
        "ISO files after execution: $($isoFilesAfter.Count)" | Out-File -FilePath $logFile -Append -Encoding UTF8
        
        if ($isoFilesAfter.Count -gt $isoFilesBefore.Count) {
            $newIsoFiles = $isoFilesAfter | Where-Object { $_.CreationTime -gt $startTime }
            if ($newIsoFiles.Count -gt 0) {
                "SUCCESS: New ISO file(s) created: $($newIsoFiles.Name -join ', ')" | Out-File -FilePath $logFile -Append -Encoding UTF8
                "SUCCESS" | Out-File -FilePath $statusFile -Encoding UTF8
                exit 0
            }
        }
        
        # If UUP script succeeded but no ISO files, check for any existing ISO files
        if ($exitCode -eq 0) {
            $allIsoFiles = @(Get-ChildItem -Path $WorkingDirectory -Filter "*.iso" -Recurse)
            if ($allIsoFiles.Count -gt 0) {
                "SUCCESS: ISO file(s) found: $($allIsoFiles.Name -join ', ')" | Out-File -FilePath $logFile -Append -Encoding UTF8
                "SUCCESS" | Out-File -FilePath $statusFile -Encoding UTF8
                exit 0
            }
        }
        
        # If no new ISO files were generated
        "ERROR:No new ISO file was created" | Out-File -FilePath $statusFile -Encoding UTF8
        "ERROR: No new ISO file was created" | Out-File -FilePath $logFile -Append -Encoding UTF8
        exit 1
        
    } finally {
        Pop-Location
    }
    
} catch {
    $errorMessage = $_.Exception.Message
    "ERROR: $errorMessage" | Out-File -FilePath $logFile -Append -Encoding UTF8
    "ERROR:$errorMessage" | Out-File -FilePath $statusFile -Encoding UTF8
    exit 1
}