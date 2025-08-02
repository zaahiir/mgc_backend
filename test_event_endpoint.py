import requests
import json

def test_event_processing():
    """Test the event processing endpoint to verify the fix works"""
    
    # Test data for creating an event
    test_data = {
        'EventName': 'Test Event',
        'EventDescription': 'Test Description',
        'is_active': 'true',
        'EventStartDate': '2024-01-01',
        'EventEndDate': '2024-01-02',
        'EventTime': '10:00',
        'EventLocation': 'Test Location'
    }
    
    try:
        # Make POST request to the event processing endpoint
        response = requests.post(
            'http://localhost:8000/apis/event/0/processing/',
            data=test_data,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Event processing endpoint is working!")
            return True
        else:
            print("❌ FAILED: Event processing endpoint returned an error")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to the server. Make sure Django is running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing event processing endpoint...")
    test_event_processing() 