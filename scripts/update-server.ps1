# PowerShell script to update the code on the AWS Server
param (
    [string]$IP = "65.2.131.107",
    [string]$KeyFile = "travel-hub-key.pem"
)

Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  TravelHub Server Update Tool                            " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green

# 1. SSH into the server and run update commands
Write-Host "Connecting to server at $IP and pulling latest code..." -ForegroundColor Yellow

ssh -i $KeyFile ubuntu@$IP @"
    cd /opt/travel-hub
    echo '>>> Pulling new code from GitHub...'
    git pull origin dev
    
    echo '>>> Rebuilding and restarting containers...'
    sudo docker-compose up -d --build
    
    echo '>>> Cleaning up old docker images...'
    sudo docker image prune -f
    
    echo '>>> System Status:'
    sudo docker ps
"@

Write-Host ""
Write-Host "[OK] Server has been updated successfully!" -ForegroundColor Green
Write-Host "Check your API at: https://api.letsgoto.in/api/v1/health" -ForegroundColor Cyan
