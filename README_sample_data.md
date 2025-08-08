# Sample Data Creation Scripts

This directory contains Python scripts for creating sample data for the Golf Club Management System.

## Available Scripts

### 1. `create_sample_gender_nationality.py`

This script creates sample records for Gender and Nationality (Country) models.

**Features:**
- Creates 4 gender options: Male, Female, Other, Prefer not to say
- Creates 103+ countries with their ISO country codes and dial codes
- Uses `get_or_create` to avoid duplicate records
- Provides detailed output of what was created

**Usage:**
```bash
python create_sample_gender_nationality.py
```

**Output:**
- Creates gender records for common gender options
- Creates country records for major countries worldwide
- Shows progress and summary of created records

### 2. `create_sample_members.py`

This script creates 10 sample members for testing purposes.

**Features:**
- Creates 10 sample members with predefined credentials
- Generates unique Golf Club IDs
- Creates associated gender, country, and plan records if they don't exist
- Provides login credentials for testing

**Usage:**
```bash
python create_sample_members.py
```

**Sample Credentials Created:**
- User 1: user1 / password1
- User 2: user2 / password2
- ... and so on up to user10

## Prerequisites

Before running these scripts, make sure:

1. Django environment is properly set up
2. Database migrations have been applied
3. You have the required dependencies installed

## Running the Scripts

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/mgc_backend
   ```

2. **Run the gender and nationality script:**
   ```bash
   python create_sample_gender_nationality.py
   ```

3. **Run the members script (optional):**
   ```bash
   python create_sample_members.py
   ```

## Script Features

### Error Handling
- Scripts use `get_or_create` to avoid duplicate records
- Comprehensive error handling with try-catch blocks
- User confirmation before execution

### Data Validation
- Checks for existing records before creating new ones
- Validates data integrity
- Provides detailed feedback on what was created

### Output Format
- Clear progress indicators (✅, ⏭️)
- Summary statistics
- Detailed logging of created records

## Data Created

### Genders
- Male
- Female
- Other
- Prefer not to say

### Countries (Sample)
- United States (US) - +1
- United Kingdom (GB) - +44
- Canada (CA) - +1
- Australia (AU) - +61
- Germany (DE) - +49
- France (FR) - +33
- And 97+ more countries...

## Notes

- Scripts are idempotent - they can be run multiple times safely
- Existing records are skipped, not overwritten
- All created records have `hideStatus = 0` (visible)
- Scripts provide detailed feedback on what was created or skipped

## Troubleshooting

If you encounter issues:

1. **Django not found:** Make sure you're in the correct directory and Django is installed
2. **Database connection issues:** Check your database settings in `mgc/settings.py`
3. **Permission errors:** Ensure you have write permissions to the database

## Contributing

To add more sample data:

1. Follow the existing pattern in the scripts
2. Use `get_or_create` to avoid duplicates
3. Add proper error handling
4. Update this README with new script information
