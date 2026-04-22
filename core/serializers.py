from rest_framework import serializers
from .models import *

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'phone']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        if user.role == 'barber':
            BarberProfile.objects.create(user=user)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'date_joined']
class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ['barber_profile']

class PortfolioPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioPhoto
        fields = '__all__'
        read_only_fields = ['barber_profile']

class BarberProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    services = ServiceSerializer(many=True, read_only=True)
    photos = PortfolioPhotoSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = BarberProfile
        fields = '__all__'

    def get_average_rating(self, obj):
        bookings = Booking.objects.filter(
            time_slot__barber_profile=obj,
            review__isnull=False
        )
        reviews = Review.objects.filter(booking__in=bookings)
        if reviews.exists():
            return round(reviews.aggregate(
                avg=models.Avg('rating'))['avg'], 1)
        return None

class TimeSlotSerializer(serializers.ModelSerializer):
    # NEW: A virtual field that calculates the name on the fly
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = '__all__' 
        read_only_fields = ['barber_profile'] 

    # The function that calculates the value for 'display_name'
    def get_display_name(self, obj):
        # 1. If it's a walk-in, grab the text directly from this table
        if obj.status == 'walk_in':
            return obj.client_name
            
        # 2. If it's booked, travel across the database to the Booking table!
        elif obj.status == 'booked':
            try:
                # Because Booking has a OneToOneField to TimeSlot, Django 
                # secretly created a reverse link called '.booking' for us!
                customer = obj.booking.customer
                
                # Combine first and last name, or use username as a fallback
                full_name = f"{customer.first_name} {customer.last_name}".strip()
                return full_name if full_name else customer.username
            except Exception:
                # Fallback just in case the booking record is missing
                return "Registered Customer"
                
        # 3. If it's available, show nothing
        return ""

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'