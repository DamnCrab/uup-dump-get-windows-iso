#!/usr/bin/pwsh
param(
    [string]$windowsTargetName,
    [string]$destinationDirectory='output'
)

Set-StrictMode -Version Latest
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
trap {
    Write-Host "ERROR: $_"
    @(($_.ScriptStackTrace -split '\r?\n') -replace '^(.*)$','ERROR: $1') | Write-Host
    @(($_.Exception.ToString() -split '\r?\n') -replace '^(.*)$','ERROR EXCEPTION: $1') | Write-Host
    Exit 1
}

# Function to remove special characters from title for safe file naming
function Remove-SpecialCharacters($text) {
    if ([string]::IsNullOrEmpty($text)) {
        return $text
    }
    # Remove or replace characters that are invalid in file names
    # Windows invalid characters: < > : " | ? * \ /
    # Also remove other potentially problematic characters
    return $text -replace '[<>:"|?*\\/\[\]{}()~`!@#$%^&+=,;\s]+', ' ' -replace '\s+', ' ' -replace '^\s+|\s+$', ''
}

$TARGETS = @{
    # see https://en.wikipedia.org/wiki/Windows_11
    # see https://en.wikipedia.org/wiki/Windows_11_version_history
    # "windows-11" = @{
    #     search = "windows 11 22631 amd64" # aka 23H2. Enterprise EOL: November 10, 2026.
    #     edition = "Professional"
    #     virtualEdition = "Enterprise"
    # }
    # see https://en.wikipedia.org/wiki/Windows_Server_2022
    "windows-server-21h2-zh-cn" = @{
        search = "feature update server operating system 20348 amd64" # aka 21H2. Mainstream EOL: October 13, 2026.
        edition = "ServerStandard"
        virtualEdition = $null
        lang = "zh-cn"
    }
    # Windows 11 24H2 Chinese - Updated search pattern for better matching
    "windows-11-24h2-zh-cn" = @{
        search = "Windows 11 version 24H2 26100 amd64" # More specific search for 24H2
        edition = "Professional"
        virtualEdition = $null # Build all virtual editions
        lang = "zh-cn"
    }
    # Windows Server 2025 (24H2) Chinese
    # "windows-server-24h2-zh-cn" = @{
    #     search = "feature update server operating system 26100 amd64" # aka 24H2/2025
    #     edition = "ServerStandard"
    #     virtualEdition = $null
    #     lang = "zh-cn"
    # }
    # Windows 10 22H2 Chinese - Updated search pattern
    "windows-10-22h2-zh-cn" = @{
        search = "Windows 10 version 22H2 19045 amd64" # More specific search for 22H2
        edition = "Professional"
        virtualEdition = $null # Build all virtual editions
        lang = "zh-cn"
    }
}

function New-QueryString([hashtable]$parameters) {
    @($parameters.GetEnumerator() | ForEach-Object {
        "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))"
    }) -join '&'
}

function Invoke-UupDumpApi([string]$name, [hashtable]$body) {
    # see https://git.uupdump.net/uup-dump/json-api
    for ($n = 0; $n -lt 15; ++$n) {
        if ($n) {
            Write-Host "Waiting a bit before retrying the uup-dump api ${name} request #$n"
            Start-Sleep -Seconds 10
            Write-Host "Retrying the uup-dump api ${name} request #$n"
        }
        try {
            return Invoke-RestMethod `
                -Method Get `
                -Uri "https://api.uupdump.net/$name.php" `
                -Body $body
        } catch {
            Write-Host "WARN: failed the uup-dump api $name request: $_"
        }
    }
    throw "timeout making the uup-dump api $name request"
}

function Get-UupDumpIso($name, $target) {
    Write-Host "Getting the $name metadata with search: '$($target.search)'"
    Write-Host "Target configuration for ${name}:"
    Write-Host "  Search: $($target.search)"
    Write-Host "  Edition: $($target.edition)"
    Write-Host "  Lang: $($target.lang)"
    
    # Extract target properties to local variables to ensure proper scope
    $targetLang = if ($target.ContainsKey('lang')) { $target.lang } else { 'en-us' }
    $targetEdition = $target.edition
    $targetVirtualEdition = $target.virtualEdition
    
    $result = Invoke-UupDumpApi listid @{
        search = $target.search
    }
    
    # Check if we have valid results
    $buildCount = 0
    if ($result -and $result.response -and $result.response.builds) {
        $buildCount = ($result.response.builds.PSObject.Properties | Measure-Object).Count
    }
    
    # If no results found with specific search, try a broader search for Chinese builds
    if ($buildCount -eq 0 -and $targetLang -eq "zh-cn") {
        Write-Host "No builds found with specific search. Trying broader search for Chinese builds..."
        $broadSearch = switch ($name) {
            "windows-11-24h2-zh-cn" { "26100 amd64" }
            "windows-10-22h2-zh-cn" { "19045 amd64" }
            "windows-server-21h2-zh-cn" { "20348 amd64" }
            default { $target.search }
        }
        Write-Host "Trying broader search: '$broadSearch'"
        $result = Invoke-UupDumpApi listid @{
            search = $broadSearch
        }
        
        # Recheck build count after broader search
        $buildCount = 0
        if ($result -and $result.response -and $result.response.builds) {
            $buildCount = ($result.response.builds.PSObject.Properties | Measure-Object).Count
        }
    }
    Write-Host "Found $buildCount builds for $name"
    
    if ($buildCount -eq 0) {
        Write-Host "No builds found for $name. This might indicate:"
        Write-Host "  1. The search terms are too specific"
        Write-Host "  2. No Chinese language pack is available for this build"
        Write-Host "  3. The build version might be outdated"
        return $null
    }
    
    $result.response.builds.PSObject.Properties `
        | ForEach-Object {
            $id = $_.Value.uuid
            $uupDumpUrl = 'https://uupdump.net/selectlang.php?' + (New-QueryString @{
                id = $id
            })
            Write-Host "Processing $name build $($_.Value.build) with ID $id"
            Write-Host "  Title: $($_.Value.title)"
            Write-Host "  UUP Dump URL: $uupDumpUrl"
            $_
        } `
        | Where-Object {
            # Always exclude Preview builds regardless of search terms
            $isPreview = $_.Value.title -like '*Preview*'
            if ($isPreview) {
                Write-Host "Skipping Preview build: $($_.Value.title)"
                return $false
            }
            return $true
        } `
        | ForEach-Object {
            # get more information about the build. eg:
            #   "langs": {
            #     "en-us": "English (United States)",
            #     "pt-pt": "Portuguese (Portugal)",
            #     ...
            #   },
            #   "info": {
            #     "title": "Feature update to Microsoft server operating system, version 21H2 (20348.643)",
            #     "flight": "Active",
            #     "arch": "amd64",
            #     "build": "20348.643",
            #     "checkBuild": "10.0.20348.1",
            #     "sku": 8,
            #     "created": 1649783041,
            #     "sha256ready": true
            #   }
            $id = $_.Value.uuid
            Write-Host "Getting the $name $id langs metadata"
            $result = Invoke-UupDumpApi listlangs @{
                id = $id
            }
            if ($result.response.updateInfo.build -ne $_.Value.build) {
                throw 'for some reason listlangs returned an unexpected build'
            }
            $_.Value | Add-Member -NotePropertyMembers @{
                langs = $result.response.langFancyNames
                info = $result.response.updateInfo
            }
            $langs = $_.Value.langs.PSObject.Properties.Name
            $editions = if ($langs -contains $targetLang) {
                Write-Host "Getting the $name $id editions metadata for language $targetLang"
                $result = Invoke-UupDumpApi listeditions @{
                    id = $id
                    lang = $targetLang
                }
                $result.response.editionFancyNames
            } else {
                Write-Host "Skipping. Expected langs=$targetLang. Got langs=$($langs -join ',')."
                [PSCustomObject]@{}
            }
            $_.Value | Add-Member -NotePropertyMembers @{
                editions = $editions
            }
            $_
        } `
        | Where-Object {
            # only return builds that:
            #   1. have the expected language (zh-cn for Chinese builds)
            #   2. match the requested edition
            $langs = $_.Value.langs.PSObject.Properties.Name
            $editions = $_.Value.editions.PSObject.Properties.Name
            $result = $true
            
            Write-Host "Checking language support for build $($_.Value.uuid). Expected: $targetLang, Available: $($langs -join ',')"
            if ($langs -notcontains $targetLang) {
                Write-Host "Skipping build $($_.Value.uuid). Expected langs=$targetLang. Got langs=$($langs -join ',')."
                $result = $false
            } else {
                Write-Host "Language $targetLang is supported for build $($_.Value.uuid)"
            }
            
            Write-Host "Checking edition support for build $($_.Value.uuid). Expected: $targetEdition, Available: $($editions -join ',')"
            if ($editions -notcontains $targetEdition) {
                Write-Host "Skipping build $($_.Value.uuid). Expected editions=$targetEdition. Got editions=$($editions -join ',')."
                $result = $false
            } else {
                Write-Host "Edition $targetEdition is supported for build $($_.Value.uuid)"
            }
            
            if ($result) {
                Write-Host "Build $($_.Value.uuid) meets all criteria (lang: $targetLang, edition: $targetEdition)"
            }
            $result
        } `
        | Select-Object -First 1 `
        | ForEach-Object {
            $id = $_.Value.uuid
            [PSCustomObject]@{
                name = $name
                title = $_.Value.title
                titleSafe = Remove-SpecialCharacters $_.Value.title
                build = $_.Value.build
                id = $id
                edition = $targetEdition
                virtualEdition = $targetVirtualEdition
                lang = $targetLang
                apiUrl = 'https://api.uupdump.net/get.php?' + (New-QueryString @{
                    id = $id
                    lang = $targetLang
                    edition = $targetEdition
                    #noLinks = '1' # do not return the files download urls.
                })
                downloadUrl = 'https://uupdump.net/download.php?' + (New-QueryString @{
                    id = $id
                    pack = $targetLang
                    edition = $targetEdition
                })
                # NB you must use the HTTP POST method to invoke this packageUrl
                #    AND in the body you must include:
                #           autodl=2 updates=1 cleanup=1
                #           OR
                #           autodl=3 updates=1 cleanup=1 virtualEditions[]=Enterprise
                downloadPackageUrl = 'https://uupdump.net/get.php?' + (New-QueryString @{
                    id = $id
                    pack = $targetLang
                    edition = $targetEdition
                })
            }
        }
}

function Get-IsoWindowsImages($isoPath) {
    $isoPath = Resolve-Path $isoPath
    Write-Host "Mounting $isoPath"
    $isoImage = Mount-DiskImage $isoPath -PassThru
    try {
        $isoVolume = $isoImage | Get-Volume
        $installPath = "$($isoVolume.DriveLetter):\sources\install.wim"
        Write-Host "Getting Windows images from $installPath"
        Get-WindowsImage -ImagePath $installPath `
            | ForEach-Object {
                $image = Get-WindowsImage `
                    -ImagePath $installPath `
                    -Index $_.ImageIndex
                $imageVersion = $image.Version
                [PSCustomObject]@{
                    index = $image.ImageIndex
                    name = $image.ImageName
                    version = $imageVersion
                }
            }
    } finally {
        Write-Host "Dismounting $isoPath"
        Dismount-DiskImage $isoPath | Out-Null
    }
}

function Get-WindowsIso($name, $destinationDirectory) {
    $iso = Get-UupDumpIso $name $TARGETS.$name
    
    if ($null -eq $iso) {
        throw "No suitable build found for $name. Please check if Chinese language pack is available for this version."
    }
    
    Write-Host "Selected build for ${name}:"
    Write-Host "  Title: $($iso.title)"
    Write-Host "  Build: $($iso.build)"
    Write-Host "  Language: $($iso.lang)"
    Write-Host "  Edition: $($iso.edition)"
    if ($iso.virtualEdition) {
        Write-Host "  Virtual Edition: $($iso.virtualEdition)"
    }

    # ensure the build is a version number.
    if ($iso.build -notmatch '^\d+\.\d+$') {
        throw "unexpected $name build: $($iso.build)"
    }

    $buildDirectory = "$destinationDirectory"
    $destinationIsoPath = Join-Path -Path $buildDirectory -ChildPath "$($iso.titleSafe).iso"
    $destinationIsoMetadataPath = "$destinationIsoPath.json"
    $destinationIsoChecksumPath = "$destinationIsoPath.sha256.txt"

    # create the build directory.
    if (Test-Path $buildDirectory) {
        Remove-Item -Force -Recurse $buildDirectory | Out-Null
    }
    New-Item -ItemType Directory -Force $buildDirectory | Out-Null

    # define the iso title.
    $edition = if ($iso.virtualEdition) {
        $iso.virtualEdition
    } else {
        $iso.edition
    }
    $title = "$name $edition $($iso.build)"

    Write-Host "Downloading the UUP dump download package for $title from $($iso.downloadPackageUrl)"
    
    # Determine if this is a server image
    $isServerImage = $name -like "*server*"
    
    # Determine virtual editions to build
    $virtualEditionsToUse = @()
    if ($iso.virtualEdition -eq $null) {
        # Build all virtual editions - get available editions from the build
        $targetConfig = $TARGETS.$name
        if ($targetConfig.ContainsKey('virtualEdition') -and $targetConfig.virtualEdition -eq $null) {
            Write-Host "Building all available virtual editions"
            # For Windows client editions, typically include Enterprise, Education, Pro
            $virtualEditionsToUse = @("Enterprise", "Education", "Professional")
        }
    } elseif ($iso.virtualEdition -is [array]) {
        # Build specified virtual editions from array
        $virtualEditionsToUse = $iso.virtualEdition
        Write-Host "Building specified virtual editions: $($virtualEditionsToUse -join ', ')"
    } elseif ($iso.virtualEdition) {
        # Build single specified virtual edition
        $virtualEditionsToUse = @($iso.virtualEdition)
        Write-Host "Building single virtual edition: $($iso.virtualEdition)"
    }
    
    $downloadPackageBody = if ($virtualEditionsToUse.Count -gt 0) {
        # Windows images with virtual editions
        $body = @{
            autodl = 3
            updates = 1
            cleanup = 1
            netfx = 1
            esd = 1
        }
        # Add all virtual editions
        for ($i = 0; $i -lt $virtualEditionsToUse.Count; $i++) {
            $body["virtualEditions[$i]"] = $virtualEditionsToUse[$i]
        }
        $body
    } elseif ($isServerImage) {
        # Server images
        @{
            autodl = 2
            updates = 1
            cleanup = 1
            netfx = 1
            esd = 1
        }
    } else {
        # Regular Windows images without virtual editions
        @{
            autodl = 3
            updates = 1
            cleanup = 1
            netfx = 1
            esd = 1
        }
    }
    
    Write-Host "Using download parameters:"
    $downloadPackageBody.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key) = $($_.Value)"
    }
    Invoke-WebRequest `
        -Method Post `
        -Uri $iso.downloadPackageUrl `
        -Body $downloadPackageBody `
        -OutFile "$buildDirectory.zip" `
        | Out-Null
    Expand-Archive "$buildDirectory.zip" $buildDirectory

    # patch the uup-converter configuration.
    # see the ConvertConfig $buildDirectory/ReadMe.html documentation.
    # see https://github.com/abbodi1406/BatUtil/tree/master/uup-converter-wimlib
    $convertConfig = (Get-Content $buildDirectory/ConvertConfig.ini) `
        -replace '^(AutoExit\s*)=.*','$1=1' `
        -replace '^(ResetBase\s*)=.*','$1=1' `
        -replace '^(SkipWinRE\s*)=.*','$1=1'
    
    if ($virtualEditionsToUse.Count -gt 0) {
        $convertConfig = $convertConfig `
            -replace '^(StartVirtual\s*)=.*','$1=1' `
            -replace '^(vDeleteSource\s*)=.*','$1=1'
        
        if ($virtualEditionsToUse.Count -eq 1) {
            # Single virtual edition
            $convertConfig = $convertConfig `
                -replace '^(vAutoEditions\s*)=.*',"`$1=$($virtualEditionsToUse[0])"
        } else {
            # Multiple virtual editions - use comma-separated list
            $editionsList = $virtualEditionsToUse -join ','
            $convertConfig = $convertConfig `
                -replace '^(vAutoEditions\s*)=.*',"`$1=$editionsList"
        }
        
        Write-Host "Configured virtual editions: $($virtualEditionsToUse -join ', ')"
    }
    Set-Content `
        -Encoding ascii `
        -Path $buildDirectory/ConvertConfig.ini `
        -Value $convertConfig

    Write-Host "Creating the $title iso file inside the $buildDirectory directory"
    Push-Location $buildDirectory
    # NB we have to use powershell cmd to workaround:
    #       https://github.com/PowerShell/PowerShell/issues/6850
    #       https://github.com/PowerShell/PowerShell/pull/11057
    # NB we have to use | Out-String to ensure that this powershell instance
    #    waits until all the processes that are started by the .cmd are
    #    finished.
    powershell cmd /c uup_download_windows.cmd | Out-String -Stream
    if ($LASTEXITCODE) {
        throw "uup_download_windows.cmd failed with exit code $LASTEXITCODE"
    }
    Pop-Location

    $sourceIsoPath = Resolve-Path $buildDirectory/*.iso

    Write-Host "Getting the $sourceIsoPath checksum"
    $isoChecksum = (Get-FileHash -Algorithm SHA256 $sourceIsoPath).Hash.ToLowerInvariant()
    Set-Content -Encoding ascii -NoNewline `
        -Path $destinationIsoChecksumPath `
        -Value $isoChecksum

    $windowsImages = Get-IsoWindowsImages $sourceIsoPath

    # create the iso metadata file.
    Set-Content `
        -Path $destinationIsoMetadataPath `
        -Value (
            ([PSCustomObject]@{
                name = $name
                title = $iso.title
                titleSafe = $iso.titleSafe
                build = $iso.build
                checksum = $isoChecksum
                images = @($windowsImages)
                uupDump = @{
                    id = $iso.id
                    apiUrl = $iso.apiUrl
                    downloadUrl = $iso.downloadUrl
                    downloadPackageUrl = $iso.downloadPackageUrl
                }
            } | ConvertTo-Json -Depth 99) -replace '\\u0026','&'
        )

    Write-Host "Moving the created $sourceIsoPath to $destinationIsoPath"
    Move-Item -Force $sourceIsoPath $destinationIsoPath

    Write-Host 'All Done.'
}

Get-WindowsIso $windowsTargetName $destinationDirectory
