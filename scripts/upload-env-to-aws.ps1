# PowerShell script to upload environment variables to AWS Systems Manager Parameter Store
param (
    [string]$EnvFile = ".env",
    [string]$Environment = "production",
    [string]$Region = "ap-south-1"
)

# RE-ADDED the leading slash for "Fully Qualified Name"
$Prefix = "/travel-hub/$Environment"

# 1. Choose which environment to upload
Write-Host "Select Environment to Upload:" -ForegroundColor Cyan
Write-Host "1. Local (.env)"
Write-Host "2. Production (.env.production)"
$choice = Read-Host "Choice (1 or 2)"

if ($choice -eq "2") {
    $EnvFile = ".env.production"
    $Prefix = "/travel-hub/production"
    $Environment = "production" # Update the Environment variable as well
} else {
    $EnvFile = ".env"
    $Prefix = "/travel-hub/development" # Changed to development for local, assuming this is the intent
    $Environment = "development" # Update the Environment variable as well
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "[ERROR] Environment file '$EnvFile' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  AWS Parameter Store Environment Upload Tool (Win)       " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Environment: $Environment" -ForegroundColor Green
Write-Host "  AWS Region: $Region" -ForegroundColor Green
Write-Host "  Parameter Name Prefix: $Prefix/" -ForegroundColor Green
Write-Host "  Source File: $EnvFile" -ForegroundColor Green
Write-Host ""

# Validate AWS credentials
Write-Host "Validating AWS credentials..." -ForegroundColor Yellow
$identityJson = aws sts get-caller-identity --region $Region
if ($LASTEXITCODE -ne 0 -or -not $identityJson) {
    Write-Host "[ERROR] Invalid AWS credentials or AWS CLI not configured!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] AWS credentials validated" -ForegroundColor Green
Write-Host ""

$SuccessCount = 0
$ErrorCount = 0

# Read .env file
$envContent = Get-Content $EnvFile
foreach ($lineRaw in $envContent) {
    $line = $lineRaw.Trim()
    
    # Skip comments and empty lines
    if ($line.StartsWith("#") -or [string]::IsNullOrWhiteSpace($line)) {
        continue
    }

    # Split into key and value
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        
        # Remove surrounding quotes if present
        if ($value -match '^"(.*)"$') { $value = $Matches[1] }
        elseif ($value -match "^'(.*)'$") { $value = $Matches[1] }

        if ([string]::IsNullOrWhiteSpace($value)) {
            continue
        }

        # Determine if it's a secret
        $paramType = "String"
        if ($key -match "(PASSWORD|SECRET|KEY|TOKEN|PRIVATE|CREDENTIALS|API_KEY)") {
            $paramType = "SecureString"
            Write-Host "Uploading SECRET: $Prefix/$key" -ForegroundColor Yellow
        } else {
            Write-Host "Uploading PARAMETER: $Prefix/$key" -ForegroundColor Green
        }

        $paramFullName = "$Prefix/$key"

        # Step 1: Upload (with overwrite)
        aws ssm put-parameter `
            --name "$paramFullName" `
            --value "$value" `
            --type $paramType `
            --overwrite `
            --region $Region > $null

        if ($LASTEXITCODE -eq 0) {
            # Step 2: Add Tags separately
            aws ssm add-tags-to-resource `
                --resource-type "Parameter" `
                --resource-id "$paramFullName" `
                --tags "Key=Environment,Value=$Environment" "Key=ManagedBy,Value=PowerShellScript" `
                --region $Region > $null
                
            Write-Host "  [OK] Successfully uploaded and tagged" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "  [ERROR] Failed to upload $key" -ForegroundColor Red
            $ErrorCount++
        }
    }
}

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  Upload Summary                                          " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  Successful: $SuccessCount parameters" -ForegroundColor Green
Write-Host "  Failed: $ErrorCount parameters" -ForegroundColor Red
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "[OK] All environment variables uploaded successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERROR] Some parameters failed to upload." -ForegroundColor Red
    exit 1
}
