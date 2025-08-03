# Member Creation System - Localhost Development

This system has been modified for localhost development without email sending. All member credentials are displayed in the terminal and UI.

## Changes Made

### Backend Changes (Django)

1. **Email Sending Disabled**: The `send_credentials_with_qr_email` function is commented out
2. **Terminal Logging**: Member credentials are now logged to the terminal instead of sending emails
3. **New API Endpoint**: Added `/apis/member/create-sample-members/` to create 10 sample members
4. **Enhanced Response**: The API now returns credentials in the response for UI display

### Frontend Changes (Angular)

1. **Create Members Component**: Updated to display credentials in the UI after creation
2. **List Members Component**: Added "Create Sample Members" button
3. **Member Service**: Added `createSampleMembers()` method

## How to Use

### Method 1: Using the Web Interface

1. **Create Individual Members**:
   - Go to `/members/add`
   - Fill in the required fields
   - Submit the form
   - Credentials will be displayed on the page and logged in terminal

2. **Create Sample Members**:
   - Go to `/members`
   - Click "Create Sample Members" button
   - Confirm the action
   - 10 sample members will be created with credentials logged in terminal

### Method 2: Using the Python Script

1. **Run the script directly**:
   ```bash
   python create_sample_members.py
   ```

2. **Or run via Django management**:
   ```bash
   python manage.py shell
   ```
   Then in the shell:
   ```python
   exec(open('create_sample_members.py').read())
   ```

## Sample Member Credentials

When you create sample members, you'll get 10 members with these credentials:

| No. | Email | Password | Member ID | Name |
|-----|-------|----------|-----------|------|
| 1 | john.smith@example.com | password1 | MGC24120001 | John Smith |
| 2 | sarah.johnson@example.com | password2 | MGC24120002 | Sarah Johnson |
| 3 | michael.brown@example.com | password3 | MGC24120003 | Michael Brown |
| 4 | emily.davis@example.com | password4 | MGC24120004 | Emily Davis |
| 5 | david.wilson@example.com | password5 | MGC24120005 | David Wilson |
| 6 | lisa.anderson@example.com | password6 | MGC24120006 | Lisa Anderson |
| 7 | robert.taylor@example.com | password7 | MGC24120007 | Robert Taylor |
| 8 | jennifer.martinez@example.com | password8 | MGC24120008 | Jennifer Martinez |
| 9 | william.garcia@example.com | password9 | MGC24120009 | William Garcia |
| 10 | amanda.rodriguez@example.com | password10 | MGC24120010 | Amanda Rodriguez |

## Terminal Output

When members are created, you'll see output like this in the terminal:

```
=== NEW MEMBER CREATED ===
Email: john.smith@example.com
Password: password1
Member ID: MGC24120001
QR Token: 12345678-1234-1234-1234-123456789abc
Full Name: John Smith
Phone: +1-555-1001
==========================
```

## API Endpoints

### Create Individual Member
- **URL**: `POST /apis/member/0/processing/`
- **Response**: Includes credentials in `data` field

### Create Sample Members
- **URL**: `POST /apis/member/create-sample-members/`
- **Response**: Array of created members with credentials

## Requirements

Before creating members, ensure you have:
1. At least one Plan in the database
2. At least one Gender record
3. At least one Country record
4. At least one PaymentStatus record
5. At least one PaymentMethod record

## Security Note

⚠️ **Important**: This system is for development only. In production:
1. Re-enable email sending
2. Remove credential logging from terminal
3. Implement proper security measures
4. Use secure password generation
5. Implement proper authentication

## Reverting to Production

To revert to production mode with email sending:

1. **Backend**: Uncomment the email sending code in `apis/views.py`
2. **Frontend**: Remove credential display from UI components
3. **Security**: Implement proper authentication and authorization 