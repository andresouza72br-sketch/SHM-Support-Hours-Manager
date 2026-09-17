from django.urls import path
from apps.core.views import BrandingPublicoView, BrandingAdminView

urlpatterns = [
    path("branding/", BrandingPublicoView.as_view(), name="branding_publico"),
    path("admin/branding/", BrandingAdminView.as_view(), name="branding_admin"),
]
