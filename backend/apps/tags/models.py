from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    displayable = models.BooleanField(default=False)

    class Meta:
        db_table = 'tags'

    def __str__(self):
        return self.name
