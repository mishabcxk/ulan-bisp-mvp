import os
import stripe
from rest_framework.views import APIView
from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from .models import *
from .serializers import *
from django.db.models import Q


# --- AUTH ---
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class MeView(generics.RetrieveUpdateAPIView):
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
        search_query = self.request.query_params.get('service') # React still sends this as ?service=
        
        if search_query:
            # This tells Django: "Match if the Service Name contains the word OR (|) if the Username contains the word!"
            qs = qs.filter(
                Q(services__name__icontains=search_query) | 
                Q(user__username__icontains=search_query)
            )
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

class MyBarberProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = BarberProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    # We override get_object so the URL doesn't need an ID (e.g., /api/my/profile/1).
    # It just securely grabs whoever is currently logged in!
    def get_object(self):
        return self.request.user.barber_profile

class MyServicesView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only list services belonging to this specific barber
        return Service.objects.filter(barber_profile=self.request.user.barber_profile)

    def perform_create(self, serializer):
        # Securely attach the logged-in barber to the new service
        serializer.save(barber_profile=self.request.user.barber_profile)

class MyServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Security check: Barbers can only edit/delete their OWN services!
        return Service.objects.filter(barber_profile=self.request.user.barber_profile)

    # We override the default 'create' method to add our Upsert logic
    def create(self, request, *args, **kwargs):
        # 1. Grab the currently logged-in barber
        my_barber_profile = request.user.barber_profile

        # 2. Extract the exact date and time from React's request
        date = request.data.get('date')
        start_time = request.data.get('start_time')

        # 3. Look to see if a slot already exists for this exact time
        existing_slot = TimeSlot.objects.filter(
            barber_profile=my_barber_profile,
            date=date,
            start_time=start_time
        ).first()

        if existing_slot:
            # SAFETY CHECK: Don't let bulk-availability overwrite a booked customer!
            if existing_slot.status == 'booked' and request.data.get('status') == 'available':
                return Response(
                    {"detail": "Cannot overwrite a booked slot."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # UPSERT: Update the existing slot (e.g., changing 'available' to 'walk_in')
            serializer = self.get_serializer(existing_slot, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save() 
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        else:
            # INSERT: Create a brand new slot
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(barber_profile=my_barber_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class MyPhotosView(generics.ListCreateAPIView):
    serializer_class = PortfolioPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only fetch photos for the currently logged-in barber
        return PortfolioPhoto.objects.filter(barber_profile=self.request.user.barber_profile)

    def perform_create(self, serializer):
        # Securely attach the uploaded photo to the logged-in barber
        serializer.save(barber_profile=self.request.user.barber_profile)

class MyPhotoDetailView(generics.DestroyAPIView):
    serializer_class = PortfolioPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Security: Barbers can only delete their OWN photos
        return PortfolioPhoto.objects.filter(barber_profile=self.request.user.barber_profile)

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
    
# --- STRIPE ---

    # Set your secret key (In production, put this in a .env file!)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY') 

class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            service_id = request.data.get('service_id')
            service = Service.objects.get(id=service_id)
            
            # Stripe requires amounts in the smallest currency unit. 
            # E.g., if you are testing with USD, $10.00 is 1000 cents.
            # We will use 'usd' for the sandbox to avoid local currency errors.
            amount = int(float(service.price) * 100) 

            # Create a PaymentIntent with the order amount and currency
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd', 
                automatic_payment_methods={'enabled': True},
            )
            return Response({'clientSecret': intent.client_secret})
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)