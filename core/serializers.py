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
        fields = ['id', 'username', 'email', 'role', 'phone']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class PortfolioPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioPhoto
        fields = '__all__'

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
    class Meta:
        model = TimeSlot
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'

class WalkInSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkIn
        fields = '__all__'