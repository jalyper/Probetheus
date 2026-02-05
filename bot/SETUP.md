# Bot Setup - Manual Steps

## PM2 Startup Persistence

The PM2 startup script requires sudo access. Run the following command manually:

```bash
sudo env PATH=$PATH:/home/keato/.nvm/versions/node/v22.22.0/bin /home/keato/.nvm/versions/node/v22.22.0/lib/node_modules/pm2/bin/pm2 startup systemd -u keato --hp /home/keato
```

This enables PM2 to auto-start on boot. You only need to run this once.

After starting your bot processes with PM2, run:
```bash
pm2 save
```

This saves the current process list so PM2 can restore it after reboot.

## WSL2 Keep-Alive

A Windows Task Scheduler task has been created: `WSL2-KeepAlive-Probetheus`

This task pings WSL2 every 5 minutes to prevent idle shutdown.

To verify it's running:
```powershell
Get-ScheduledTask -TaskName "WSL2-KeepAlive-Probetheus"
```

To manually run the task:
```powershell
Start-ScheduledTask -TaskName "WSL2-KeepAlive-Probetheus"
```

## Discord Bot Token Setup

See the checkpoint instructions in plan 01-02 for how to:
1. Create the Discord bot in Developer Portal
2. Enable MESSAGE CONTENT INTENT
3. Generate bot token
4. Get your Discord user ID
5. Create `.env` file with credentials
