from django.contrib import admin

from .models import Route


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'distance', 'estimated_time', 'maximum_elevation_degree', 'visibility',
                    'created_at']
    search_fields = ['user__username', 'description']
    list_filter = ['tags', 'visibility', 'created_at']
    ordering = ['-created_at']
    filter_horizontal = ['tags']
    raw_id_fields = ['user']
