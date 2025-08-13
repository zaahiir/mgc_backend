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

## Note about excluded paths (e.g., tools/)
The sync script intentionally excludes `tools/` from automatic syncing. If you create files under the live path `httpdocs/django/src/tools/*` (for example, `tools/seeds/*`), they will NOT be copied into the Git checkout by the script.

To commit and push such files, manually copy them from the live directory into the Git repo, then add/commit/push:

```bash
# 1) Copy from LIVE → REPO (example for seeds)
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
  "mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/seeds && \
   rsync -a --delete \
   /var/www/vhosts/mastergolfclub.com/httpdocs/django/src/tools/seeds/ \
   /var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/seeds/"

# 2) (Optional) Ignore Python cache files in Git
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
  "grep -qxF '__pycache__/' /var/www/vhosts/mastergolfclub.com/httpdocs-git/.gitignore || echo '__pycache__/' >> /var/www/vhosts/mastergolfclub.com/httpdocs-git/.gitignore"
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
  "grep -qxF '*.pyc' /var/www/vhosts/mastergolfclub.com/httpdocs-git/.gitignore || echo '*.pyc' >> /var/www/vhosts/mastergolfclub.com/httpdocs-git/.gitignore"

# 3) Commit and push
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
  "git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git add tools/seeds .gitignore && \
   git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git commit -m 'feat(tools): add/update seeds' || true && \
   git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git push"

# 4) Verify
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc \
  "git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git log -1 --oneline --decorate && \
   git -C /var/www/vhosts/mastergolfclub.com/httpdocs-git status -sb"
```

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
