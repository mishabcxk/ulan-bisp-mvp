import os
import stripe
import datetime
import random
from rest_framework.views import APIView
from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from .models import *
from .serializers import *
from django.db.models import Q, Min
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail

# --- AUTH ---
class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # 1. Validate and save the user (This triggers the Serializer we wrote earlier!)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save() 

        # 2. Generate a random 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        # 3. Store the OTP in the cache, attached to their email. It expires in 600 seconds (10 mins).
        cache.set(f"otp_{user.email}", otp_code, timeout=600)

        # 4. Send the Email! (This will print in your terminal for now)
        send_mail(
            subject="Your Ulan Verification Code",
            message=f"Welcome to Ulan! \n\nYour 6-digit verification code is: {otp_code}\n\nThis code will expire in 10 minutes.",
            from_email="noreply@ulan.com",
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response(
            {"detail": "User created. OTP sent to email."}, 
            status=status.HTTP_201_CREATED
        )

# NEW: The view that React pings when the user types in the 6 digits
class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({"detail": "Email and code are required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Look up the code in the cache
        saved_code = cache.get(f"otp_{email}")

        # 2. Check if it exists and matches
        if saved_code is not None and saved_code == code:
            try:
                # Find the locked user and unlock them!
                user = User.objects.get(email=email)
                user.is_active = True
                user.save()
                
                # Delete the OTP from the cache so it can't be used again
                cache.delete(f"otp_{email}")
                
                return Response({"detail": "Email verified successfully!"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # If the code was wrong, or if 10 minutes passed and it deleted itself:
        return Response({"detail": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user

User = get_user_model()
class CheckUniqueView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        field = request.query_params.get('field')
        value = request.query_params.get('value')
        
        if not field or not value:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        is_taken = False
        
        # Check the User table
        if field == 'username':
            is_taken = User.objects.filter(username__iexact=value).exists()
        elif field == 'phone':
            is_taken = User.objects.filter(phone=value).exists()
        elif field == 'email':
            is_taken = User.objects.filter(email__iexact=value).exists()
            
        # Check the BarberProfile table
        elif field == 'legalName':
            is_taken = BarberProfile.objects.filter(legal_name__iexact=value).exists()
        elif field == 'taxId':
            is_taken = BarberProfile.objects.filter(tax_id=value).exists()
            
        return Response({"is_taken": is_taken}, status=status.HTTP_200_OK)
    
# --- PASSWORD RESET FLOW ---
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
            
            # Generate a 6-digit OTP
            otp_code = str(random.randint(100000, 999999))
            
            # Store it in cache with a special 'reset' prefix for 10 minutes
            cache.set(f"otp_reset_{user.email}", otp_code, timeout=600)

            # Send the Email (Will print to terminal for now)
            send_mail(
                subject="Ulan Password Reset Code",
                message=f"We received a request to reset your password.\n\nYour 6-digit reset code is: {otp_code}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.",
                from_email="noreply@ulan.com",
                recipient_list=[user.email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            # SECURITY BEST PRACTICE: Don't tell the user if the email exists or not.
            # This prevents malicious bots from guessing user emails.
            pass

        # Always return the same message regardless of whether the email was real
        return Response(
            {"detail": "If that email is in our system, we have sent a reset code."}, 
            status=status.HTTP_200_OK
        )

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')

        if not all([email, code, new_password]):
            return Response({"detail": "Email, code, and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Look up the reset code in the cache
        saved_code = cache.get(f"otp_reset_{email}")

        if saved_code is not None and saved_code == code:
            try:
                user = User.objects.get(email__iexact=email)
                
                # Securely set the new password and save
                user.set_password(new_password)
                user.save()
                
                # Delete the OTP from the cache so it cannot be reused
                cache.delete(f"otp_reset_{email}")
                
                return Response({"detail": "Password has been reset successfully!"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"detail": "Invalid or expired reset code."}, status=status.HTTP_400_BAD_REQUEST)

# --- BARBER CATALOG (CX) ---
class BarberListView(generics.ListAPIView):
    serializer_class = BarberProfileSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = BarberProfile.objects.all()
        
        # 1. The Omni-Search (Searches Names, Usernames, Bios, and Services all at once!)
        search_term = self.request.query_params.get('q', None)
        if search_term:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search_term) |
                Q(user__last_name__icontains=search_term) |
                Q(user__username__icontains=search_term) |
                Q(bio__icontains=search_term) |
                Q(services__name__icontains=search_term)
            ).distinct() # Distinct prevents duplicates if a term matches multiple services
            
        # 2. The Price Slider Filter
        max_price = self.request.query_params.get('max_price', None)
        if max_price:
            # This calculates the lowest service price for each barber, 
            # and hides them if their cheapest service is more expensive than the slider
            queryset = queryset.annotate(min_price=Min('services__price')).filter(min_price__lte=max_price)
            
        return queryset

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

# --- CUSTOMER DASHBOARD (CX) ---
class MyCustomerBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 1. Grab the currently logged-in user
        user = self.request.user
        
        # 2. Return ONLY the bookings where this user is the customer
        # We order it by date so their newest bookings show up at the top!
        return Booking.objects.filter(customer=user).order_by('-time_slot__date', '-time_slot__start_time')

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

class MyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        barber = request.user.barber_profile
        today = datetime.date.today()

        # Grab all slots for this barber
        my_slots = TimeSlot.objects.filter(barber_profile=barber)
        today_slots = my_slots.filter(date=today)
        
        # 1. Today's Bookings (Walk-ins + Registered Bookings)
        today_bookings = today_slots.filter(status__in=['booked', 'walk_in']).count()
        
        # 2. Overall Bookings (All time)
        overall_bookings = my_slots.filter(status__in=['booked', 'walk_in']).count()
        
        # 3. Today's Revenue
        # We loop through today's registered bookings and sum the prices of their services.
        # Note: Since Walk-ins don't have a linked 'Service' yet, they won't count toward 
        # this revenue total. We can always add a custom price to Walk-ins later!
        today_revenue = 0
        for slot in today_slots.filter(status='booked'):
            if hasattr(slot, 'booking') and slot.booking.service:
                today_revenue += slot.booking.service.price

        return Response({
            'today_bookings': today_bookings,
            'today_revenue': today_revenue,
            'overall_bookings': overall_bookings
        })
    
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