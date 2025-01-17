from django.db import models
from django.conf import settings


class Review(models.Model):
    RATING_CHOICES = [
        (1, '1'),
        (2, '2'),
        (3, '3'),
        (4, '4'),
        (5, '5'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    route = models.ForeignKey(
        'routes.Route',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    description = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    tags = models.ManyToManyField('tags.Tag', related_name='reviews', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'

    def __str__(self):
        return f"Review by {self.user.username}"


class Photo(models.Model):
    review = models.ForeignKey(
        'Review',
        on_delete=models.CASCADE,
        related_name='photos'
    )
    photo = models.ImageField(upload_to='review_photos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews_photos'

    def __str__(self):
        return f"Photo for Review ID {self.review.id}"


class Vote(models.Model):
    UPVOTE = 'upvote'
    DOWNVOTE = 'downvote'

    VOTE_CHOICES = [
        (UPVOTE, 'Upvote'),
        (DOWNVOTE, 'Downvote'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    vote_type = models.CharField(max_length=10, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'review')
        db_table = 'reviews_votes'

    def __str__(self):
        return f"{self.user.username} voted {self.vote_type} on review {self.review.id}"
