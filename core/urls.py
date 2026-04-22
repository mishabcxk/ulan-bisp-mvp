from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView
)
from . import views
from core.views import CreateBookingView, CreatePaymentIntentView

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', TokenObtainPairView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/me/', views.MeView.as_view()),

    # CX - Customer browsing
    path('barbers/', views.BarberListView.as_view()),
    path('barbers/<int:pk>/', views.BarberDetailView.as_view()),
    path('barbers/<int:barber_id>/slots/',
         views.BarberTimeSlotsView.as_view()),
    path('barbers/<int:barber_id>/reviews/',
         views.BarberReviewsView.as_view()),

    # BX - Barber dashboard
    path('my/schedule/', views.MyScheduleView.as_view()),
    path('my/slots/', views.CreateTimeSlotView.as_view()),
    path('my/profile/', views.MyBarberProfileView.as_view()),
    path('my/services/', views.MyServicesView.as_view()),
    path('my/services/<int:pk>/', views.MyServiceDetailView.as_view()),
    path('my/photos/', views.MyPhotosView.as_view()),
    path('my/photos/<int:pk>/', views.MyPhotoDetailView.as_view()),

    # Reviews
    path('reviews/', views.CreateReviewView.as_view()),

    # Stripe
    path('bookings/', CreateBookingView.as_view(), name='create-booking'),
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
]