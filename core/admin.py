from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (User, BarberProfile, Service, PortfolioPhoto,
                     TimeSlot, Booking, Review)

admin.site.register(User, UserAdmin)
admin.site.register(BarberProfile)
admin.site.register(Service)
admin.site.register(PortfolioPhoto)
admin.site.register(TimeSlot)
admin.site.register(Booking)
admin.site.register(Review)

