#!/bin/bash

# Production Environment Setup Script for Master Golf Club
# Run this script on your Linux server as root or with sudo

echo "Setting up production environment for Master Golf Club..."

# Set environment variable for production
export DJANGO_ENVIRONMENT=production

# Create necessary directories
echo "Creating directories..."
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/member_photos
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/blog_images
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/course_images
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/events
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/instructor_photos
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/amenity_icons
sudo mkdir -p /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/static

# Set proper ownership (assuming www-data is your web server user)
echo "Setting ownership..."
sudo chown -R www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/

# Set proper permissions
echo "Setting permissions..."
sudo chmod -R 755 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/
sudo chmod -R 775 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media/
sudo chmod 664 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/db.sqlite3

# Create .env file for environment variables
echo "Creating environment file..."
cat > /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env << EOF
DJANGO_ENVIRONMENT=production
DJANGO_SECRET_KEY=your-secret-key-here
EOF

# Set proper permissions for .env file
sudo chown www-data:www-data /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env
sudo chmod 600 /var/www/vhosts/mastergolfclub.com/httpdocs/django/site/.env

echo "Production environment setup complete!"
echo "Please restart your web server and Django application."
