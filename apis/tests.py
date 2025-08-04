from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import *
from datetime import datetime, timedelta, time
from decimal import Decimal

# Create your tests here.

class TeeBookingTestCase(APITestCase):
    def setUp(self):
        # Create test member
        self.member = MemberModel.objects.create(
            firstName="Test",
            lastName="User",
            email="test@example.com",
            phoneNumber="1234567890",
            plan=PlanModel.objects.create(
                planName="Test Plan",
                planPrice=Decimal('100.00')
            )
        )
        
        # Create test course
        self.course = CourseModel.objects.create(
            courseName="Test Golf Course",
            courseAddress="123 Test Street",
            courseOpenFrom=time(6, 0),  # 6:00 AM
            coursePhoneNumber="1234567890"
        )
        
        # Create test tee
        self.tee = TeeModel.objects.create(
            course=self.course,
            holeNumber=9
        )
    
    def test_get_tees_by_course(self):
        """Test getting tees for a specific course"""
        url = reverse('tee-list')
        response = self.client.get(url, {'course_id': self.course.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The response is a list, not a dict with 'code'
        self.assertTrue(len(response.data) > 0)
        
        tee_data = response.data[0]
        self.assertEqual(tee_data['holeNumber'], 9)
        self.assertEqual(tee_data['label'], '9 Holes')
    
    def test_get_available_slots(self):
        """Test getting available time slots for a date and tee"""
        tomorrow = datetime.now().date() + timedelta(days=1)
        url = reverse('booking-available_slots')
        
        response = self.client.get(url, {
            'course_id': self.course.id,
            'date': tomorrow.strftime('%Y-%m-%d'),
            'tee_id': self.tee.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 1)
        self.assertTrue(len(response.data['data']) > 0)
    
    def test_create_booking(self):
        """Test creating a new booking"""
        tomorrow = datetime.now().date() + timedelta(days=1)
        url = reverse('booking-list')
        
        booking_data = {
            'member': self.member.id,
            'course': self.course.id,
            'tee': self.tee.id,
            'bookingDate': tomorrow.strftime('%Y-%m-%d'),
            'bookingTime': '10:00',
            'participants': 2,
            'status': 'pending'
        }
        
        response = self.client.post(url, booking_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 1)
        self.assertEqual(response.data['data']['participants'], 2)
    
    def test_booking_validation(self):
        """Test booking validation - past date should fail"""
        yesterday = datetime.now().date() - timedelta(days=1)
        url = reverse('booking-list')
        
        booking_data = {
            'member': self.member.id,
            'course': self.course.id,
            'tee': self.tee.id,
            'bookingDate': yesterday.strftime('%Y-%m-%d'),
            'bookingTime': '10:00',
            'participants': 1,
            'status': 'pending'
        }
        
        response = self.client.post(url, booking_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 0)
