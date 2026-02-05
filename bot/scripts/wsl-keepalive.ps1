# WSL2 Keep-Alive Script
# Prevents WSL2 from auto-shutting down during idle periods
# Scheduled via Windows Task Scheduler to run every 5 minutes
wsl -d Ubuntu -- echo "keepalive" > $null
