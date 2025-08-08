# Production Environment Setup Guide

## Issues Fixed
1. **Permission denied for media directory**: Server can't write to `/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/member_photos`
2. **Readonly database**: SQLite database is in read-only mode

## Quick Fix Commands

### 1. Fix Media Directory Permissions
```bash
# Connect to your server via SSH
ssh root@your-server-ip

# Fix media directory permissions
sudo chown -R www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media
sudo chmod -R 755 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media

# Create member_photos directory if it doesn't exist
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/member_photos
sudo chown -R www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/member_photos
sudo chmod -R 755 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/member_photos
```

### 2. Fix Database Permissions
```bash
# Fix database file permissions
sudo chown www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/db.sqlite3
sudo chmod 664 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/db.sqlite3

# Fix database directory permissions
sudo chown www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/
sudo chmod 755 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/
```

### 3. Restart Web Server
```bash
# Restart Apache/Nginx and Django application
sudo systemctl restart apache2  # or nginx if you're using nginx
sudo systemctl restart your-django-app  # replace with your actual service name
```

## Automated Setup

### Option 1: Use the Setup Script
```bash
# Upload the setup_production.sh script to your server
scp setup_production.sh root@your-server-ip:/tmp/

# SSH to your server and run the script
ssh root@your-server-ip
cd /tmp
chmod +x setup_production.sh
./setup_production.sh
```

### Option 2: Manual Setup

1. **Set Environment Variable**
   ```bash
   export DJANGO_ENVIRONMENT=production
   ```

2. **Create .env file**
   ```bash
   sudo nano /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env
   ```
   
   Add the following content:
   ```
   DJANGO_ENVIRONMENT=production
   DJANGO_SECRET_KEY=your-secret-key-here
   ```

3. **Set proper permissions for .env**
   ```bash
   sudo chown www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env
   sudo chmod 600 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env
   ```

## Environment Configuration

The Django settings have been updated to automatically detect the environment:

- **Development**: Uses local paths (`./media/`, `./static/`, `./db.sqlite3`)
- **Production**: Uses server paths (`/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/...`)

## Verification

After running the setup, verify that:

1. **Media directory is writable**:
   ```bash
   sudo -u www-data touch /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/test.txt
   sudo -u www-data rm /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/test.txt
   ```

2. **Database is writable**:
   ```bash
   sudo -u www-data touch /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/db.sqlite3
   ```

3. **Test member creation**:
   Try creating a member through your admin interface or API.

## Troubleshooting

### If you still get permission errors:

1. **Check web server user**:
   ```bash
   ps aux | grep apache  # or nginx
   ```

2. **Update ownership to match your web server user**:
   ```bash
   # Replace www-data with your actual web server user
   sudo chown -R your-web-server-user:your-web-server-user /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/
   ```

3. **Check SELinux** (if applicable):
   ```bash
   sudo setsebool -P httpd_can_network_connect 1
   sudo setsebool -P httpd_unified 1
   ```

### If database is still read-only:

1. **Check file system permissions**:
   ```bash
   ls -la /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/db.sqlite3
   ```

2. **Check if file system is mounted read-only**:
   ```bash
   mount | grep /var/www
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Regularly backup your database and media files
- Monitor file permissions and ownership
- Use HTTPS in production
- Keep your Django secret key secure

## Support

If you continue to have issues, check:
1. Web server error logs
2. Django application logs
3. File system permissions
4. SELinux status (if applicable)
5. Disk space and inode usage
