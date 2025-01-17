from django.contrib.auth.models import AbstractUser
from django.db import models


def user_profile_photo_path(instance, filename):
    # Generate a new filename using the user's username and original file extension
    ext = filename.split('.')[-1]
    return f'profile_photos/{instance.username}.{ext}'


class CustomUser(AbstractUser):
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to=user_profile_photo_path, blank=True, null=True)
    birth_day = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.username
