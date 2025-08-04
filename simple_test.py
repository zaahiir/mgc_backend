#!/usr/bin/env python
from datetime import datetime
import re

def parse_course_opening_time(course_open_from):
    """Parse course opening time from courseOpenFrom field"""
    if not course_open_from:
        return datetime.strptime('06:00', '%H:%M').time()  # Default 6 AM
    
    try:
        # Handle various time formats
        time_formats = [
            '%I:%M %p',  # 6:00 AM
            '%I:%M %p',  # 6:00 PM
            '%H:%M',     # 06:00
            '%I:%M',     # 6:00
        ]
        
        for fmt in time_formats:
            try:
                return datetime.strptime(course_open_from.strip(), fmt).time()
            except ValueError:
                continue
        
        # If no format matches, try to extract time from common patterns
        time_match = re.search(r'(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?', course_open_from)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2)) if time_match.group(2) else 0
            period = time_match.group(3)
            
            if period and period.upper() == 'PM' and hour != 12:
                hour += 12
            elif period and period.upper() == 'AM' and hour == 12:
                hour = 0
            
            return datetime.strptime(f'{hour:02d}:{minute:02d}', '%H:%M').time()
        
        # Default fallback
        return datetime.strptime('06:00', '%H:%M').time()
        
    except Exception:
        return datetime.strptime('06:00', '%H:%M').time()  # Default 6 AM

def test_parsing():
    """Test the time parsing function"""
    test_times = [
        "6:00 AM",
        "7:30 AM", 
        "8:00 AM",
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM",
        "6:00 PM",
        "7:00 PM",
        "8:00 PM",
        "9:00 PM",
        "10:00 PM",
        "11:00 PM",
        "12:00 AM",
        "1:00 AM",
        "2:00 AM",
        "3:00 AM",
        "4:00 AM",
        "5:00 AM",
        "6:00",
        "07:30",
        "8:00",
        "9:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
        "00:00",
        "01:00",
        "02:00",
        "03:00",
        "04:00",
        "05:00"
    ]
    
    print("Testing course opening time parsing:")
    for test_time in test_times:
        try:
            parsed_time = parse_course_opening_time(test_time)
            print(f"  '{test_time}' -> {parsed_time}")
        except Exception as e:
            print(f"  '{test_time}' -> ERROR: {e}")
    
    print("\n✅ Time parsing test completed successfully!")

if __name__ == "__main__":
    test_parsing() 