#!/usr/bin/env python3
"""
Test script to verify superuser login functionality
"""
import requests
import json

def test_login():
    url = "http://localhost/apis/login/"
    
    # Test data - replace with actual superuser credentials
    test_data = {
        "username": "admin",  # Replace with actual superuser username
        "password": "admin123"  # Replace with actual superuser password
    }
    
    try:
        print(f"Testing login endpoint: {url}")
        print(f"Test data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(url, json=test_data, timeout=10)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Response data: {json.dumps(data, indent=2)}")
            
            # Verify the response structure
            required_fields = ['access', 'refresh', 'user_type', 'user_id', 'username', 'email']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"Warning: Missing fields in response: {missing_fields}")
            else:
                print("All required fields present in response")
                
            if data.get('user_type') == 'superuser':
                print("✓ User type is correctly set to 'superuser'")
            else:
                print(f"✗ User type is '{data.get('user_type')}', expected 'superuser'")
                
        else:
            print(f"Error response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    test_login() 