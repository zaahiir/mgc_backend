import os
import sys
import django
from datetime import date

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import EventModel
from apis.serializers import EventModelSerializer

def test_event_date_field():
    """Test that EventDate field works as a DateField"""
    print("Testing EventDate field as DateField...")
    
    # Test data with proper date format
    test_data = {
        'EventTitle': 'Test Event',
        'EventDate': '2025-01-15',  # ISO date format
        'EventVenue': 'Test Venue',
        'EventEntryPrice': '$50',
        'EventDetails': 'Test details',
        'EventActivities': 'Test activities',
        'EventDetailOrganizer': 'Test Organizer',
        'EventEndDate': '2025-01-20',
        'EventTime': '14:00',
        'EventEmail': 'test@example.com',
        'EventPhone': '1234567890',
        'is_active': True,
        'hideStatus': 0
    }
    
    # Test serializer
    serializer = EventModelSerializer(data=test_data)
    if serializer.is_valid():
        print("✅ Serializer validation passed")
        event = serializer.save()
        print(f"✅ Event created with ID: {event.id}")
        print(f"✅ EventDate: {event.EventDate} (type: {type(event.EventDate)})")
        
        # Test that EventDate is a date object
        if isinstance(event.EventDate, date):
            print("✅ EventDate is a proper date object")
        else:
            print("❌ EventDate is not a date object")
            
        # Clean up
        event.delete()
        print("✅ Test event deleted")
    else:
        print("❌ Serializer validation failed:")
        print(serializer.errors)

if __name__ == '__main__':
    test_event_date_field() 