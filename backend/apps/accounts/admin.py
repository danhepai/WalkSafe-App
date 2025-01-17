from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = UserAdmin.list_display + ('photo',)
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('description', 'photo', 'birth_day')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ['description']}),
    )


admin.site.register(CustomUser, CustomUserAdmin)
