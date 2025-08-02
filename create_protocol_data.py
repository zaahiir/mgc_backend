#!/usr/bin/env python
"""
Script to create sample protocol data for member-team functionality
Run this with: python manage.py shell < create_protocol_data.py
"""

from apis.models import ProtocolModel

def create_protocol_data():
    print("Creating sample protocol data...")
    
    # Sample protocol data
    protocols_data = [
        {
            'protocolTitle': 'Dress Code Policies & Clubhouse Info',
            'protocolDescription': 'Our golf club maintains the highest standards of elegance and professionalism. We believe that proper attire enhances the overall experience for all members and guests, creating an atmosphere of respect and tradition. Our dress code ensures that all members and visitors feel comfortable while maintaining the prestigious atmosphere of our club. We require collared shirts, appropriate golf attire, and proper footwear on the course and in designated areas.'
        },
        {
            'protocolTitle': 'Golf Course Etiquette & Rules',
            'protocolDescription': 'To ensure an enjoyable experience for all members and guests, we ask that you follow proper golf course etiquette. This includes maintaining a good pace of play, repairing ball marks on greens, raking bunkers after use, and keeping noise levels appropriate. Please respect other players and maintain the course conditions for everyone\'s enjoyment.'
        },
        {
            'protocolTitle': 'Clubhouse Facilities & Services',
            'protocolDescription': 'Our clubhouse offers world-class facilities including locker rooms, dining areas, pro shop, and practice facilities. All members have access to these amenities during operating hours. We provide professional staff to assist with any needs and ensure your experience is exceptional. Please check with our staff for current operating hours and any special arrangements.'
        }
    ]
    
    for protocol_data in protocols_data:
        protocol, created = ProtocolModel.objects.get_or_create(
            protocolTitle=protocol_data['protocolTitle'],
            defaults=protocol_data
        )
        if created:
            print(f"Created protocol: {protocol.protocolTitle}")
        else:
            print(f"Protocol already exists: {protocol.protocolTitle}")
    
    print("\nSample protocol data created successfully!")
    print("You can now test the dynamic protocol functionality.")

if __name__ == "__main__":
    create_protocol_data() 