from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time
from apis.models import CourseModel, AmenitiesModel


class Command(BaseCommand):
    help = 'Delete all existing courses and create 10 new ones with TimeField values'

    def handle(self, *args, **options):
        # Delete all existing courses
        CourseModel.objects.all().delete()
        self.stdout.write(
            self.style.SUCCESS('Successfully deleted all existing courses')
        )

        # Create 10 new courses with proper TimeField values
        courses_data = [
            {
                'courseName': 'Royal Golf Club',
                'courseAddress': '123 Golf Avenue, Downtown',
                'courseOpenFrom': time(6, 0),  # 6:00 AM
                'coursePhoneNumber': '+1-555-0101',
                'courseAlternatePhoneNumber': '+1-555-0102',
                'courseWebsite': 'https://royalgolfclub.com',
                'courseDescription': 'Premium golf course with 18 holes and professional facilities.',
                'courseLocation': '40.7128,-74.0060'
            },
            {
                'courseName': 'Pine Valley Golf Resort',
                'courseAddress': '456 Pine Street, Suburbia',
                'courseOpenFrom': time(7, 0),  # 7:00 AM
                'coursePhoneNumber': '+1-555-0201',
                'courseAlternatePhoneNumber': '+1-555-0202',
                'courseWebsite': 'https://pinevalleygolf.com',
                'courseDescription': 'Scenic golf resort surrounded by pine forests.',
                'courseLocation': '40.7589,-73.9851'
            },
            {
                'courseName': 'Ocean View Golf Links',
                'courseAddress': '789 Beach Road, Coastal City',
                'courseOpenFrom': time(6, 30),  # 6:30 AM
                'coursePhoneNumber': '+1-555-0301',
                'courseAlternatePhoneNumber': '+1-555-0302',
                'courseWebsite': 'https://oceanviewgolf.com',
                'courseDescription': 'Beautiful oceanfront golf course with stunning views.',
                'courseLocation': '40.7608,-73.9752'
            },
            {
                'courseName': 'Mountain Peak Golf Club',
                'courseAddress': '321 Mountain Drive, Highlands',
                'courseOpenFrom': time(8, 0),  # 8:00 AM
                'coursePhoneNumber': '+1-555-0401',
                'courseAlternatePhoneNumber': '+1-555-0402',
                'courseWebsite': 'https://mountainpeakgolf.com',
                'courseDescription': 'Challenging mountain course with elevation changes.',
                'courseLocation': '40.7484,-73.9857'
            },
            {
                'courseName': 'Sunset Golf & Country Club',
                'courseAddress': '654 Sunset Boulevard, Westside',
                'courseOpenFrom': time(6, 15),  # 6:15 AM
                'coursePhoneNumber': '+1-555-0501',
                'courseAlternatePhoneNumber': '+1-555-0502',
                'courseWebsite': 'https://sunsetgolfclub.com',
                'courseDescription': 'Exclusive country club with premium amenities.',
                'courseLocation': '40.7505,-73.9934'
            },
            {
                'courseName': 'Riverside Golf Course',
                'courseAddress': '987 River Lane, Riverside',
                'courseOpenFrom': time(7, 30),  # 7:30 AM
                'coursePhoneNumber': '+1-555-0601',
                'courseAlternatePhoneNumber': '+1-555-0602',
                'courseWebsite': 'https://riversidegolf.com',
                'courseDescription': 'Peaceful course along the river with natural beauty.',
                'courseLocation': '40.7549,-73.9844'
            },
            {
                'courseName': 'Heritage Golf Club',
                'courseAddress': '147 Heritage Way, Historic District',
                'courseOpenFrom': time(6, 45),  # 6:45 AM
                'coursePhoneNumber': '+1-555-0701',
                'courseAlternatePhoneNumber': '+1-555-0702',
                'courseWebsite': 'https://heritagegolfclub.com',
                'courseDescription': 'Historic golf club with traditional design.',
                'courseLocation': '40.7589,-73.9851'
            },
            {
                'courseName': 'Emerald Greens Golf Resort',
                'courseAddress': '258 Emerald Drive, Green Valley',
                'courseOpenFrom': time(7, 15),  # 7:15 AM
                'coursePhoneNumber': '+1-555-0801',
                'courseAlternatePhoneNumber': '+1-555-0802',
                'courseWebsite': 'https://emeraldgreensgolf.com',
                'courseDescription': 'Lush green course with excellent maintenance.',
                'courseLocation': '40.7505,-73.9934'
            },
            {
                'courseName': 'Crystal Lake Golf Club',
                'courseAddress': '369 Crystal Lake Road, Lakeside',
                'courseOpenFrom': time(8, 30),  # 8:30 AM
                'coursePhoneNumber': '+1-555-0901',
                'courseAlternatePhoneNumber': '+1-555-0902',
                'courseWebsite': 'https://crystallakegolf.com',
                'courseDescription': 'Serene course with crystal clear lake views.',
                'courseLocation': '40.7549,-73.9844'
            },
            {
                'courseName': 'Golden Eagle Golf Course',
                'courseAddress': '741 Eagle Ridge, Eagle Heights',
                'courseOpenFrom': time(6, 0),  # 6:00 AM
                'coursePhoneNumber': '+1-555-1001',
                'courseAlternatePhoneNumber': '+1-555-1002',
                'courseWebsite': 'https://goldeneaglegolf.com',
                'courseDescription': 'Championship course with challenging holes.',
                'courseLocation': '40.7484,-73.9857'
            }
        ]

        # Create courses
        created_courses = []
        for course_data in courses_data:
            course = CourseModel.objects.create(**course_data)
            created_courses.append(course)
            self.stdout.write(
                self.style.SUCCESS(f'Created course: {course.courseName}')
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(created_courses)} new courses')
        ) 