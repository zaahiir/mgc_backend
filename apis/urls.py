from django.urls import path
from rest_framework import routers
from django.conf.urls import include
from .views import *

router = routers.DefaultRouter()

router.register('user', UserViewSet, basename='user'),
router.register('userType', UserTypeViewSet, basename='userType'),
router.register('country', CountryViewSet, basename='country'),
router.register('gender', GenderViewSet, basename='gender'),
router.register('paymentMethod', PaymentMethodViewSet, basename='paymentMethod'),
router.register('paymentStatus', PaymentStatusViewSet, basename='paymentStatus'),
router.register('planType', PlanTypeViewSet, basename='planType'),
router.register('planDuration', PlanDurationViewSet, basename='planDuration'),
router.register('planCycle', PlanCycleViewSet, basename='planCycle'),
router.register('amenities', AmenitiesViewSet, basename='amenities'),
router.register('plan', PlanViewSet, basename='plan'),
router.register('member', MemberViewSet, basename='member'),
router.register('course', CourseViewSet, basename='course'),
router.register('blog', BlogViewSet, basename='blog'),


urlpatterns = [
    path('', include(router.urls)),
]
