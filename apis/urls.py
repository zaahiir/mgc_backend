from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, UserTypeViewSet, CountryViewSet, GenderViewSet,
    PaymentMethodViewSet, PaymentStatusViewSet, AmenitiesViewSet,
    PlanViewSet, PlanFeatureViewSet, MemberViewSet, CollectionViewSet,
    CourseManagementViewSet, TeeViewSet, BookingViewSet, OrdersViewSet,
    BlogViewSet, ConceptViewSet, ContactEnquiryViewSet, MemberEnquiryViewSet,
    AboutViewSet, EventViewSet, EventInterestViewSet, ProtocolViewSet,
    InstructorViewSet, MessageViewSet, FAQViewSet, NotificationViewSet,
    JoinRequestViewSet
)

router = DefaultRouter()

# Register all your viewsets
router.register('user', UserViewSet, basename='user')
router.register('userType', UserTypeViewSet, basename='userType')
router.register('country', CountryViewSet, basename='country')
router.register('gender', GenderViewSet, basename='gender')
router.register('paymentMethod', PaymentMethodViewSet, basename='paymentMethod')
router.register('paymentStatus', PaymentStatusViewSet, basename='paymentStatus')

router.register('amenities', AmenitiesViewSet, basename='amenities')
router.register('plan', PlanViewSet, basename='plan')
router.register('planFeature', PlanFeatureViewSet, basename='planFeature')
router.register('member', MemberViewSet, basename='member')
router.register('collection', CollectionViewSet, basename='collection')
router.register('course', CourseManagementViewSet, basename='course')
router.register('tee', TeeViewSet, basename='tee')
router.register('booking', BookingViewSet, basename='booking')
router.register('orders', OrdersViewSet, basename='orders')
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
router.register('notification', NotificationViewSet, basename='notification')
router.register('joinRequest', JoinRequestViewSet, basename='joinRequest')

urlpatterns = [
    path('', include(router.urls)),
]
