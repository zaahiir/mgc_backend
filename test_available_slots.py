#!/usr/bin/env python3
"""
Test script to verify the available slots API is working correctly
"""

import requests
import json
from datetime import datetime, timedelta

# API base URL
BASE_URL = "http://localhost:8000/apis"

def test_available_slots():
    """Test the available slots API endpoint"""
    
    # Test parameters
    course_id = 1  # Assuming course ID 1 exists
    tee_id = 1     # Assuming tee ID 1 exists
    date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')  # Tomorrow
    
    print(f"Testing available slots API...")
    print(f"Course ID: {course_id}")
    print(f"Tee ID: {tee_id}")
    print(f"Date: {date}")
    
    # Make the API request
    url = f"{BASE_URL}/booking/available_slots/"
    params = {
        'course_id': course_id,
        'date': date,
        'tee_id': tee_id
    }
    
    try:
        response = requests.get(url, params=params)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse Data:")
            print(json.dumps(data, indent=2))
            
            if data.get('code') == 1:
                slots = data.get('data', [])
                print(f"\nFound {len(slots)} time slots")
                
                # Show first few slots
                for i, slot in enumerate(slots[:10]):
                    print(f"Slot {i+1}: {slot['time']} - Available: {slot['available']}")
                
                if len(slots) > 10:
                    print(f"... and {len(slots) - 10} more slots")
            else:
                print(f"API returned error: {data.get('message', 'Unknown error')}")
        else:
            print(f"HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the Django server is running on port 8000.")
    except Exception as e:
        print(f"Error: {e}")

def test_with_different_dates():
    """Test with different dates to see how the API behaves"""
    
    course_id = 1
    tee_id = 1
    
    dates_to_test = [
        datetime.now().strftime('%Y-%m-%d'),  # Today
        (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),  # Tomorrow
        (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),  # Next week
    ]
    
    for date in dates_to_test:
        print(f"\n{'='*50}")
        print(f"Testing date: {date}")
        print(f"{'='*50}")
        
        url = f"{BASE_URL}/booking/available_slots/"
        params = {
            'course_id': course_id,
            'date': date,
            'tee_id': tee_id
        }
        
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 1:
                    slots = data.get('data', [])
                    available_slots = [s for s in slots if s['available']]
                    print(f"Total slots: {len(slots)}")
                    print(f"Available slots: {len(available_slots)}")
                    
                    # Show first 5 available slots
                    for i, slot in enumerate(available_slots[:5]):
                        print(f"  {slot['time']} ({slot['formatted_time']})")
                else:
                    print(f"Error: {data.get('message', 'Unknown error')}")
            else:
                print(f"HTTP Error: {response.status_code}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("Testing Available Slots API")
    print("=" * 50)
    
    # Test basic functionality
    test_available_slots()
    
    # Test with different dates
    test_with_different_dates() 