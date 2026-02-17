# PowerShell script to update the code on the AWS Server
param (
    [string]$IP = "65.2.131.107",
    [string]$KeyFile = "travel-hub-key.pem"
)

Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  TravelHub Server Update Tool                            " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green

# Define commands as a single Linux-friendly string
# IMPORTANT: No Windows CRLF in the string body sent to SSH
$commands = "cd /opt/travel-hub && " +
            "echo '>>> Pulling new code from GitHub...' && " +
            "git pull origin dev && " +
            "echo '>>> Fetching environment variables from AWS Parameter Store...' && " +
            "bash scripts/fetch-env-from-aws.sh && " +
            "echo '>>> Rebuilding and restarting containers...' && " +
            "sudo docker-compose up -d --build && " +
            "echo '>>> Cleaning up old docker images...' && " +
            "sudo docker image prune -f && " +
            "echo '>>> System Status:' && " +
            "sudo docker ps"

Write-Host "Connecting to server at $IP and executing update..." -ForegroundColor Yellow

# Execute SSH command
ssh -i $KeyFile ubuntu@$IP $commands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Server has been updated successfully!" -ForegroundColor Green
    Write-Host "Check your API at: https://api.letsgoto.in/api/v1/health" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[ERROR] Update failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
