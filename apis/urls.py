from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()

# Register all your viewsets
router.register('user', UserViewSet, basename='user')
router.register('userType', UserTypeViewSet, basename='userType')
router.register('country', CountryViewSet, basename='country')
router.register('gender', GenderViewSet, basename='gender')
router.register('paymentMethod', PaymentMethodViewSet, basename='paymentMethod')
router.register('paymentStatus', PaymentStatusViewSet, basename='paymentStatus')
router.register('planType', PlanTypeViewSet, basename='planType')
router.register('planDuration', PlanDurationViewSet, basename='planDuration')
router.register('planCycle', PlanCycleViewSet, basename='planCycle')
router.register('amenities', AmenitiesViewSet, basename='amenities')
router.register('plan', PlanViewSet, basename='plan')
router.register('member', MemberViewSet, basename='member')
router.register('collection', CollectionViewSet, basename='collection')
router.register('course', CourseManagementViewSet, basename='course')
router.register('tee', TeeViewSet, basename='tee')
router.register('booking', BookingViewSet, basename='booking')
router.register('blog', BlogViewSet, basename='blog')
router.register('concept', ConceptViewSet, basename='concept')
router.register('contactEnquiry', ContactEnquiryViewSet, basename='contactEnquiry')
router.register('memberEnquiry', MemberEnquiryViewSet, basename='memberEnquiry')
router.register('about', AboutViewSet, basename='about')
router.register('event', EventViewSet, basename='event')
router.register('eventInterest', EventInterestViewSet, basename='eventInterest')
router.register('protocol', ProtocolViewSet, basename='protocol')
router.register('instructor', InstructorViewSet, basename='instructor')
router.register('message', MessageViewSet, basename='message')
router.register('faq', FAQViewSet, basename='faq')

urlpatterns = [
    path('', include(router.urls)),
]
