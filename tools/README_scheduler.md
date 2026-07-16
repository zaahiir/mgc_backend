# Auto-expire join requests — scheduled task

Pending tee **join requests** auto-expire once the tee time is within the course's
`joinRequestExpiryHours` cut-off (set per course in the admin at *Courses → Add/Update*).
Expiry also happens lazily whenever join-request lists are loaded, but scheduling the
command makes it timely even when nobody is looking.

## Files
- `expire_join_requests.bat` — runs `manage.py expire_join_requests` via the project venv, logging to `expire_join_requests.log`.
- `expire_join_requests_task.xml` — an importable Windows Task Scheduler definition (runs every 5 minutes).

## Import the scheduled task (run once, in an elevated PowerShell/cmd)
```
schtasks /create /xml "F:\Github\mgc_backend\tools\expire_join_requests_task.xml" /tn "MasterGolfClub\ExpireJoinRequests"
```

Run it on demand to verify:
```
schtasks /run /tn "MasterGolfClub\ExpireJoinRequests"
```

Remove it:
```
schtasks /delete /tn "MasterGolfClub\ExpireJoinRequests" /f
```

## Manual run (no scheduler)
```
cd F:\Github\mgc_backend
venv\Scripts\python.exe manage.py expire_join_requests
```

## Notes
- The XML runs as `InteractiveToken` (only while a user is logged in). To run whether or
  not the user is logged in, edit the task in Task Scheduler → *Run whether user is logged
  on or not*, or change `<LogonType>` to `Password`.
- Adjust the cadence by editing `<Interval>PT5M</Interval>` (e.g. `PT10M` for 10 minutes).
