from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from .models import *
from .serializers import *

# --- AUTH ---
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user

# --- BARBER CATALOG (CX) ---
class BarberListView(generics.ListAPIView):
    serializer_class = BarberProfileSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        qs = BarberProfile.objects.filter(is_verified=True)
        service_type = self.request.query_params.get('service')
        if service_type:
            qs = qs.filter(services__name__icontains=service_type)
        return qs.distinct()

class BarberDetailView(generics.RetrieveAPIView):
    serializer_class = BarberProfileSerializer
    queryset = BarberProfile.objects.all()
    permission_classes = [permissions.AllowAny]

# --- TIME SLOTS ---
class BarberTimeSlotsView(generics.ListAPIView):
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        barber_id = self.kwargs['barber_id']
        return TimeSlot.objects.filter(
            barber_profile_id=barber_id,
            status='available'
        )

# --- BOOKING (the critical flow from Section 4.3.3) ---
class CreateBookingView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        slot_id = request.data.get('time_slot')
        service_id = request.data.get('service')

        with transaction.atomic():
            # Pessimistic lock — prevents double-booking
            slot = TimeSlot.objects.select_for_update().get(id=slot_id)

            if slot.status != 'available':
                return Response(
                    {'error': 'This slot is no longer available.'},
                    status=status.HTTP_409_CONFLICT
                )

            slot.status = 'booked'
            slot.save()

            booking = Booking.objects.create(
                customer=request.user,
                time_slot=slot,
                service_id=service_id,
                status='confirmed'
            )

        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )

# --- BARBER DASHBOARD (BX) ---
class MyScheduleView(generics.ListAPIView):
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return TimeSlot.objects.filter(
            barber_profile=self.request.user.barber_profile
        ).order_by('date', 'start_time')

class CreateTimeSlotView(generics.CreateAPIView):
    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(
            barber_profile=self.request.user.barber_profile
        )

class CreateWalkInView(generics.CreateAPIView):
    serializer_class = WalkInSerializer
    permission_classes = [permissions.IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(
            barber_profile=self.request.user.barber_profile
        )

# --- REVIEWS ---
class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

class BarberReviewsView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        barber_id = self.kwargs['barber_id']
        return Review.objects.filter(
            booking__time_slot__barber_profile_id=barber_id
        )