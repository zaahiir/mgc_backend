#!/bin/bash

# Cleanup script to remove unwanted files and folders from server
# Run this script on your Plesk server

echo "Cleaning up unwanted files and folders..."

# Remove Angular frontend projects
if [ -d "Golf-Admin" ]; then
    echo "Removing Golf-Admin directory..."
    rm -rf Golf-Admin/
fi

if [ -d "master_golf_club" ]; then
    echo "Removing master_golf_club directory..."
    rm -rf master_golf_club/
fi

# Remove Django settings file
if [ -f "mgc/settings.py" ]; then
    echo "Removing mgc/settings.py..."
    rm -f mgc/settings.py
fi

# Remove development artifacts
echo "Removing development artifacts..."
rm -rf .venv/ venv/ __pycache__/ .idea/ .vscode/
rm -f *.pyc *.pyo *.pyd .Python *.so
rm -f .env .env.local .env.development.local .env.test.local .env.production.local
rm -f *.swp *.swo *~
rm -f .DS_Store .DS_Store? ._* .Spotlight-V100 .Trashes ehthumbs.db Thumbs.db
rm -f *.log
rm -rf logs/
rm -f *.sqlite3 *.db

echo "Cleanup completed!"
echo "Remaining files and folders:"
ls -la
