from django.contrib import admin

from .models import Review, Vote


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['route__title', 'user', 'rating', 'description', 'created_at']
    search_fields = ['user__username', 'route__title']
    list_filter = ['tags', 'created_at']
    ordering = ['-created_at']
    filter_horizontal = ['tags']
    raw_id_fields = ['user', 'route']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['user', 'review_id', 'vote_type', 'created_at', 'updated_at']
    search_fields = ['user__username', 'review__description']
    list_filter = ['vote_type', 'created_at']
    ordering = ['-created_at']
    raw_id_fields = ['user', 'review']
