from django.contrib import admin
from django.urls import path, include
from apis.views import UserViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.generic import TemplateView
from apis.views import index_view, membership_view, news_view

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('', index_view, name='home'),
    path('membership', membership_view, name='membership'),
    path('news', news_view, name='news'),
    path('admin/', admin.site.urls),
    path('apis/', include('apis.urls')),
    path('apis/login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('apis/logout/', UserViewSet.as_view({'post': 'logout'}), name='logout'),
    path('apis/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('apis/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
