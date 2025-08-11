# How to commit and push live changes from /var/www/vhosts/mastergolfclub.com/httpdocs/django/src

Use these commands after SSH to preview and push server changes from the live Django src directory to Git.

Live directory:
- /var/www/vhosts/mastergolfclub.com/httpdocs/django/src

Repo checkout:
- /var/www/vhosts/mastergolfclub.com/httpdocs-git

Plesk system user (has Git SSH key):
- mastergolfclub.com_qvo6e6uw5ps

Sync script (preview/push):
- /var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/push_live_changes.sh

## 1) Preview changes (no push)
```bash
sudo -u mastergolfclub.com_qvo6e6uw5ps -H \
/var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/push_live_changes.sh
```

## 2) Commit and push (after approval)
```bash
sudo -u mastergolfclub.com_qvo6e6uw5ps -H \
/var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/push_live_changes.sh push
```

The script excludes runtime artifacts:
- .git, .idea/, media/, staticfiles/, db.sqlite3, venv/, .venv/, tools/, __pycache__/, *.pyc

## 3) Deploy latest via Plesk (optional)
Plesk UI: Domains → mastergolfclub.com → Git → mgc_backend.git → Deploy

CLI:
```bash
plesk ext git --deploy -domain mastergolfclub.com -name mgc_backend.git
```

## 4) Quick checks
Last commit:
```bash
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
"git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git log -1 --oneline"
```
Current branch:
```bash
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
"git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git rev-parse --abbrev-ref HEAD"
```
