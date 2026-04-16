from django.contrib import admin
from .models import (User, BarberProfile, Service, PortfolioPhoto,
                     TimeSlot, Booking, Review, WalkIn)

admin.site.register(User)
admin.site.register(BarberProfile)
admin.site.register(Service)
admin.site.register(PortfolioPhoto)
admin.site.register(TimeSlot)
admin.site.register(Booking)
admin.site.register(Review)
admin.site.register(WalkIn)


