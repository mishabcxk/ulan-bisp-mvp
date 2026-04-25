from rest_framework import serializers
from .models import *

class UserRegistrationSerializer(serializers.ModelSerializer):
    # We explicitly declare these so Django accepts them in the request, 
    # even though they don't belong to the User model directly!
    legal_name = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    tax_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
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
    reviews_count = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)

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
    # Tell Django we are going to generate a custom field called display_name
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = '__all__'

    def get_display_name(self, obj):
        # 1. First, check if it's a manual Walk-in (where you typed the name yourself)
        if hasattr(obj, 'client_name') and obj.client_name:
            return obj.client_name
            
        # 2. If it's a registered app booking, go find the attached Booking record
        from .models import Booking
        booking = Booking.objects.filter(time_slot=obj).first()
        
        # 3. Extract their beautiful full name!
        if booking and booking.customer:
            user = booking.customer
            if user.first_name:
                return f"{user.first_name} {user.last_name}".strip()
            return user.username
            
        return "" # Return blank if it's just an 'available' slot

class BookingSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    time_slot = TimeSlotSerializer(read_only=True)
    barber_name = serializers.SerializerMethodField()
    barber_id = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    class Meta:
        model = Booking
        fields = '__all__'

    def get_has_review(self, obj):
        return Review.objects.filter(booking=obj).exists()

    def get_barber_name(self, obj):
        # Navigate through the time slot to the profile, then to the user
        user = obj.time_slot.barber_profile.user
        if user.first_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.username

    def get_barber_id(self, obj):
        return obj.time_slot.barber_profile.id

class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    date_created = serializers.DateTimeField(read_only=True, format="%B %d, %Y") # Formats nicely!

    class Meta:
        model = Review
        fields = '__all__'

    def get_customer_name(self, obj):
        user = obj.booking.customer
        if user.first_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.username