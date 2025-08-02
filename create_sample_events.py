import os
import django
from datetime import date, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import EventModel

def create_sample_events():
    """Create sample events for testing"""
    
    # Sample event 1
    event1 = EventModel.objects.create(
        EventTitle="Golf for Beginners Practice and Learning",
        EventDate=date.today() + timedelta(days=30),
        EventVenue="6391 Elgin St. Celina",
        EventEntryPrice="$60",
        EventDetails="<p>Welcome to our vibrant and welcoming golf club, where every member is part of our close-knit community. Whether you're a seasoned golfer or just starting out, our club is the perfect place to hone your skills, enjoy the game, and connect with fellow golf enthusiasts.</p><p>At our club, we believe in creating a friendly and supportive environment that fosters camaraderie and sportsmanship. Our beautifully maintained course offers challenging yet enjoyable play for golfers of all levels, with stunning landscapes and well-designed fairways that make every round a delight.</p>",
        EventActivities="<p>There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text.</p><p>All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable.</p>",
        EventDetailOrganizer="Devid Rock",
        EventEndDate=date.today() + timedelta(days=32),
        EventTime="12:00 PM",
        EventEmail="golf@example.com",
        EventPhone="+(1425) 8547-7592",
        is_active=True
    )
    
    # Sample event 2
    event2 = EventModel.objects.create(
        EventTitle="The Sponsorship Meetup is Returning",
        EventDate=date.today() + timedelta(days=45),
        EventVenue="6391 Elgin St. Celina",
        EventEntryPrice="$70",
        EventDetails="<p>Join us for an exciting sponsorship meetup where golf enthusiasts and sponsors come together to discuss the future of golf events and opportunities for collaboration.</p><p>This event will feature presentations from industry leaders, networking sessions, and discussions about upcoming tournaments and sponsorship opportunities.</p>",
        EventActivities="<p>Activities include networking sessions, sponsor presentations, golf demonstrations, and interactive workshops. Participants will have the opportunity to meet with potential sponsors and learn about upcoming events.</p>",
        EventDetailOrganizer="Golf Club Management",
        EventEndDate=date.today() + timedelta(days=47),
        EventTime="2:00 PM",
        EventEmail="sponsorship@golfclub.com",
        EventPhone="+(1425) 8547-7593",
        is_active=True
    )
    
    # Sample event 3
    event3 = EventModel.objects.create(
        EventTitle="Starter Golf Clinic and Casual Contest",
        EventDate=date.today() + timedelta(days=60),
        EventVenue="6391 Elgin St. Celina",
        EventEntryPrice="$50",
        EventDetails="<p>Perfect for beginners and intermediate players, this clinic provides hands-on instruction from professional golfers. Learn the fundamentals of golf in a relaxed, supportive environment.</p><p>The clinic includes basic swing techniques, putting practice, and course etiquette. After the clinic, participants can join a casual contest to test their newly acquired skills.</p>",
        EventActivities="<p>Morning session includes basic instruction and practice. Afternoon features a casual contest with prizes for winners. All skill levels welcome!</p>",
        EventDetailOrganizer="Professional Golf Instructors",
        EventEndDate=date.today() + timedelta(days=60),
        EventTime="9:00 AM",
        EventEmail="clinic@golfclub.com",
        EventPhone="+(1425) 8547-7594",
        is_active=True
    )
    
    print("Sample events created successfully!")
    print(f"Event 1: {event1.EventTitle}")
    print(f"Event 2: {event2.EventTitle}")
    print(f"Event 3: {event3.EventTitle}")

if __name__ == "__main__":
    create_sample_events() 