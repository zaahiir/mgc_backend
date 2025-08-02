import os
import django
from django.core.files import File
from django.core.files.base import ContentFile

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import EventModel

def create_sample_image(filename, content="Sample golf event image"):
    """Create a simple text-based image file"""
    return ContentFile(content.encode(), name=filename)

def add_images_to_events():
    """Add sample images to existing events"""
    
    # Get all events
    events = EventModel.objects.all()
    
    for i, event in enumerate(events, 1):
        try:
            # Create sample image content
            image_content = f"Sample image for {event.EventTitle}"
            
            # Create and save the main event image
            if not event.EventImage:
                event.EventImage.save(
                    f"event_{event.id}_main.jpg",
                    create_sample_image(f"event_{event.id}_main.jpg", image_content),
                    save=True
                )
            
            # Create and save activities images
            if not event.EventActivitiesimageOne:
                event.EventActivitiesimageOne.save(
                    f"event_{event.id}_activity1.jpg",
                    create_sample_image(f"event_{event.id}_activity1.jpg", f"Activity image 1 for {event.EventTitle}"),
                    save=True
                )
            
            if not event.EventActivitiesimageTwo:
                event.EventActivitiesimageTwo.save(
                    f"event_{event.id}_activity2.jpg",
                    create_sample_image(f"event_{event.id}_activity2.jpg", f"Activity image 2 for {event.EventTitle}"),
                    save=True
                )
            
            print(f"Added images to event {i}: {event.EventTitle}")
            
        except Exception as e:
            print(f"Error adding images to event {i}: {e}")
    
    print(f"\nSuccessfully added images to {events.count()} events!")

if __name__ == '__main__':
    add_images_to_events() 