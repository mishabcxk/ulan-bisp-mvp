from rest_framework import serializers
from .models import *

class UserRegistrationSerializer(serializers.ModelSerializer):
    # We explicitly declare these so Django accepts them in the request, 
    # even though they don't belong to the User model directly!
    legal_name = serializers.CharField(write_only=True, required=False)
    tax_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User # (Or whatever your custom user model is named)
        fields = ['username', 'email', 'phone', 'first_name', 'last_name', 'password', 'role', 'legal_name', 'tax_id']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # 1. Pop out the barber-specific fields so they don't break the User creation
        legal_name = validated_data.pop('legal_name', '')
        tax_id = validated_data.pop('tax_id', '')

        # 2. Create the core User securely
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'customer'),
            is_active=False
        )

        # 3. IF they are a barber, instantly build their BarberProfile!
        if user.role == 'barber':
            BarberProfile.objects.create(
                user=user,
                legal_name=legal_name,
                tax_id=tax_id
            )

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
    service = ServiceSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)
    
    # NEW: Explicitly grab the barber's info so React doesn't have to guess!
    barber_name = serializers.SerializerMethodField()
    barber_id = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'

    def get_barber_name(self, obj):
        # Navigate through the time slot to the profile, then to the user
        user = obj.time_slot.barber_profile.user
        if user.first_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.username

    def get_barber_id(self, obj):
        return obj.time_slot.barber_profile.id

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'