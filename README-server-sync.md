# Server edits → Commit and push to Git (Plesk + SSH)

This guide explains how to commit and push your server changes to Git after connecting via SSH, with a preview/approval step.

## Key paths and user

- Live code: `/var/www/vhosts/mastergolfclub.com/httpdocs/django/src`
- Git checkout: `/var/www/vhosts/mastergolfclub.com/httpdocs-git`
- Plesk system user (has Git access): `mastergolfclub.com_qvo6e6uw5ps`
- Sync script: `/var/www/vhosts/mastergolfclub.com/httpdocs-git/tools/push_live_changes.sh`

## Connect via SSH

```bash
ssh <your-ssh-user>@<your-server>
```

## Option A (recommended): Edit in the Git checkout, then commit and push

- Make changes under: `/var/www/vhosts/mastergolfclub.com/httpdocs-git`

```bash
sudo -u mastergolfclub.com_qvo6e6uw5ps -H bash -lc 
