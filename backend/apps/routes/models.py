from django.db import models
from django.conf import settings


class Route(models.Model):
    PUBLIC = 'public'
    PRIVATE = 'private'

    VISIBILITY_CHOICES = [
        (PUBLIC, 'Public'),
        (PRIVATE, 'Private'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='routes'
    )
    title = models.CharField(max_length=100, default='Untitled')
    distance = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_time = models.DurationField()
    maximum_elevation_degree = models.DecimalField(max_digits=4, decimal_places=2)
    description = models.TextField(blank=True)
    route = models.JSONField()
    tags = models.ManyToManyField('tags.Tag', related_name='routes', blank=True)
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default=PRIVATE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'routes'

    def __str__(self):
        return f"Route by {self.user.username} - {self.distance} km"


class Photo(models.Model):
    route = models.ForeignKey(
        'Route',
        on_delete=models.CASCADE,
        related_name='photos'
    )
    photo = models.ImageField(upload_to='route_photos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'routes_photos'

    def __str__(self):
        return f"Photo for Route ID {self.route.id}"
