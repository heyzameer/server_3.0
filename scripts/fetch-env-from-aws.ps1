# PowerShell script to fetch environment variables from AWS Systems Manager Parameter Store
param (
    [string]$Environment = "production",
    [string]$Region = "ap-south-1",
    [string]$OutputFile = ".env"
)

# Prefix with leading slash
$Prefix = "/travel-hub/$Environment"

Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  AWS Parameter Store Environment Fetch Tool (Win)        " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Environment: $Environment" -ForegroundColor Green
Write-Host "  AWS Region: $Region" -ForegroundColor Green
Write-Host "  Parameter Prefix: $Prefix/" -ForegroundColor Green
Write-Host "  Output File: $OutputFile" -ForegroundColor Green
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

# Backup existing .env
if (Test-Path $OutputFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backup = "$OutputFile.backup.$timestamp"
    Write-Host "Backing up existing .env to: $backup" -ForegroundColor Yellow
    Copy-Item $OutputFile $backup
}

Write-Host "Fetching parameters from AWS..." -ForegroundColor Yellow

# Fetch parameters
$rawParams = aws ssm get-parameters-by-path `
    --path "$Prefix" `
    --with-decryption `
    --region $Region `
    --query "Parameters[*].[Name,Value]" `
    --output json

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($rawParams)) {
    Write-Host "[ERROR] No parameters found or error calling AWS CLI." -ForegroundColor Red
    exit 1
}

$parameters = $rawParams | ConvertFrom-Json

if (-not $parameters -or $parameters.Length -eq 0) {
    Write-Host "[ERROR] No parameters found at path: $Prefix" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Found $($parameters.Length) parameters" -ForegroundColor Green
Write-Host ""

# Prepare file content
$content = New-Object System.Collections.Generic.List[string]
$content.Add("# Environment variables fetched from AWS Parameter Store")
$content.Add("# Generated at: $(Get-Date)")
$content.Add("# Environment: $Environment")
$content.Add("# Region: $Region")
$content.Add("")

foreach ($param in $parameters) {
    $name = $param[0]
    $value = $param[1]
    
    # Extract key name (remove prefix)
    $key = $name.Replace("$Prefix/", "")
    
    # Escape quotes and format
    $escapedValue = $value.Replace('"', '\"')
    $content.Add("$key=""$escapedValue""")
    Write-Host "  [OK] $key" -ForegroundColor Green
}

# Save to file
$content | Out-File -FilePath $OutputFile -Encoding utf8

Write-Host ""
Write-Host "[OK] Environment variables fetched and saved to $OutputFile" -ForegroundColor Green
Write-Host "Note: Keep this file secure and never commit it to version control!" -ForegroundColor Yellow
