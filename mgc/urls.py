from django.contrib import admin
from django.urls import path, include
from apis.views import UserViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.generic import TemplateView
from apis.views import index_view, membership_view, blog_detail_view

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('', index_view, name='home'),
    path('membership', membership_view, name='membership'),
    path('news/<int:blog_id>', blog_detail_view, name='blog_detail'),
    path('member/verify/<str:qr_token>/', TemplateView.as_view(template_name='member_verify.html'), name='member_verify'),
    path('tinymce/', include('tinymce.urls')),
    path('admin/', admin.site.urls),
    path('apis/', include('apis.urls')),
    path('apis/login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('apis/logout/', UserViewSet.as_view({'post': 'logout'}), name='logout'),
    path('apis/member_login/', UserViewSet.as_view({'post': 'member_login'}), name='member_login'),
    path('apis/member_logout/', UserViewSet.as_view({'post': 'member_logout'}), name='member_logout'),
    path('apis/password_reset/', UserViewSet.as_view({'post': 'password_reset'}), name='password_reset'),
    path('apis/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('apis/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)