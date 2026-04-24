from django.contrib import admin
from django.utils.html import format_html
from .models import *

# --- 1. BARBER MODERATION ---
@admin.register(BarberProfile)
class BarberProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_full_name', 'is_verified', 'address']
    list_filter = ['is_verified']
    search_fields = ['user__username', 'user__first_name', 'address']
    actions = ['verify_barbers', 'suspend_barbers']
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or "-"
    get_full_name.short_description = 'Name'

    def verify_barbers(self, request, queryset):
        queryset.update(is_verified=True)
    verify_barbers.short_description = "Mark selected as Verified"
    
    def suspend_barbers(self, request, queryset):
        queryset.update(is_verified=False)
    suspend_barbers.short_description = "Suspend selected barbers"

# --- 2. PORTFOLIO MODERATION ---
@admin.register(PortfolioPhoto)
class PortfolioPhotoAdmin(admin.ModelAdmin):
    # This allows the moderator to actually SEE the image in the list view!
    list_display = ['image_preview', 'barber_profile', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['barber_profile__user__username']
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height: 60px; border-radius: 6px; border: 1px solid #E5E7EB;" />', obj.image.url)
        return "-"
    image_preview.short_description = 'Preview'

# --- 3. BOOKING OVERSIGHT ---
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'get_barber', 'service', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['customer__username', 'customer__first_name', 'customer__phone']

    # Cross-table reference to easily see who the barber is
    def get_barber(self, obj):
        return obj.service.barber_profile.user.username
    get_barber.short_description = 'Barber'

# --- 4. REVIEW MODERATION ---
@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_customer', 'get_barber', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['booking__customer__username', 'comment']

    def get_customer(self, obj):
        return obj.booking.customer.username
    get_customer.short_description = 'Customer'

    def get_barber(self, obj):
        return obj.booking.service.barber_profile.user.username
    get_barber.short_description = 'Barber'

# --- 5. SYSTEM DATA OVERSIGHT ---
@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'barber_profile', 'price', 'duration_minutes']
    list_filter = ['duration_minutes']
    search_fields = ['name', 'barber_profile__user__username']

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ['date', 'start_time', 'barber_profile', 'status', 'client_name']
    list_filter = ['status', 'date']
    search_fields = ['barber_profile__user__username', 'client_name']