from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Avg

class User(AbstractUser):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('barber', 'Barber'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True)

class BarberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='barber_profile')
    bio = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    legal_name = models.CharField(max_length=255, blank=True, null=True)
    tax_id = models.CharField(max_length=9, blank=True, null=True)

    @property
    def reviews_count(self):
        # Counts all reviews connected to this barber through bookings
        return Review.objects.filter(booking__time_slot__barber_profile=self).count()

    @property
    def average_rating(self):
        # Averages all the review ratings and rounds to 1 decimal place (e.g., 4.8)
        reviews = Review.objects.filter(booking__time_slot__barber_profile=self)
        if reviews.exists():
            avg = reviews.aggregate(Avg('rating'))['rating__avg']
            return round(avg, 1)
        return 0.0 # Return 0 if no reviews yet

class Service(models.Model):
    barber_profile = models.ForeignKey(BarberProfile, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.IntegerField()  # in UZS
    duration_minutes = models.IntegerField(default=30)

class PortfolioPhoto(models.Model):
    barber_profile = models.ForeignKey(BarberProfile, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='portfolios/')
    caption = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class TimeSlot(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('held', 'Held'),
        ('booked', 'Booked'),
        ('walk_in', 'Walk-in'), # New option, because of the WalkIn table removal
    ]
    barber_profile = models.ForeignKey(BarberProfile, on_delete=models.CASCADE, related_name='time_slots')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='available')
    client_name = models.CharField(max_length=100, blank=True, null=True) # Moved it from WalkIn table
    notes = models.TextField(blank=True, null=True) # Moved it from WalkIn table
    class Meta:
        unique_together = ['barber_profile', 'date', 'start_time']

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
    ]
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    time_slot = models.OneToOneField(TimeSlot, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    stripe_payment_ref = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)